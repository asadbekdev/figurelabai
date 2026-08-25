import type { FlowchartDocument } from "../../flowchart/schema"
import type { FigurePlan } from "../contracts"
import { figurePlanSchema } from "../contracts"
import { GenerationError } from "../errors"
import type {
  GeneratedImage,
  GenerateFlowchartInput,
  GenerateImageInput,
  ModelProvider,
  PlanInput,
  ReviseFlowchartInput,
} from "../model-provider"
import { buildFixtureImage } from "./fixture-image"

export const FIXTURE_FAIL_TOKEN = "fail the draft"
const FAIL_TOKEN = FIXTURE_FAIL_TOKEN
const failedDrafts = new Set<string>()

export function resetFixtureFailures() {
  failedDrafts.clear()
}

function slug(value: string, fallback: string): string {
  const next = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return next || fallback
}

function titleFromPrompt(prompt: string): string {
  const first = prompt.split(/[\n.?!]/)[0]?.trim() ?? prompt
  return (first || "Fixture flowchart").slice(0, 80)
}

function sectionLabels(prompt: string): string[] {
  const parts = prompt
    .split(/[,.;\n]| then | to | and /i)
    .map((part) => part.replace(new RegExp(FAIL_TOKEN, "ig"), "").trim())
    .filter((part) => part.length >= 3)
    .slice(0, 6)

  if (parts.length >= 3) return parts.map((part) => part.slice(0, 48))
  return ["Start", titleFromPrompt(prompt), "Finish"]
}

export function buildFixturePlan(prompt: string): FigurePlan {
  const labels = sectionLabels(prompt)
  const plan = figurePlanSchema.parse({
    planVersion: 1,
    mode: "flowchart",
    title: titleFromPrompt(prompt),
    goal: prompt.slice(0, 2_000),
    orientation: "landscape",
    structure: {
      estimatedNodeCount: Math.min(16, labels.length + 2),
      primaryDirection: "left-right",
      sections: labels.map((label, index) => ({
        id: slug(label, `section-${index + 1}`),
        label,
        purpose: `Show ${label.toLowerCase()} as a durable fixture step.`,
      })),
    },
    sourceAssetIds: [],
    assumptions: [
      "This plan comes from the deterministic fixture provider, not a live model.",
      ...(prompt.toLowerCase().includes("attached")
        ? ["The attached source text was included in the fixture plan."]
        : []),
    ],
    warnings: prompt.toLowerCase().includes(FAIL_TOKEN)
      ? ["The fixture will fail at drafting so retry can be exercised."]
      : [],
    estimatedSeconds: 8,
    estimatedCredits: null,
  })
  return plan
}

export function buildFixtureFlowchart(input: {
  prompt: string
  plan?: FigurePlan
  document?: FlowchartDocument
}): unknown {
  if (input.document) {
    const noteId = `revision-${slug(input.prompt, "note")}`
    const already = input.document.nodes.some((node) => node.id === noteId)
    return {
      ...input.document,
      metadata: {
        ...input.document.metadata,
        description: input.prompt.slice(0, 400),
      },
      nodes: already
        ? input.document.nodes
        : [
            ...input.document.nodes,
            {
              id: noteId,
              type: "note",
              text: input.prompt.slice(0, 120),
              position: { x: 80, y: 80 },
              size: { width: 200, height: 84 },
            },
          ],
    }
  }

  const plan = input.plan ?? buildFixturePlan(input.prompt)
  const labels = plan.structure.sections.map((section) => section.label)
  const nodes = [
    { id: "start", type: "terminator", text: "Start" },
    ...plan.structure.sections.map((section, index) => ({
      id: section.id,
      type: index === plan.structure.sections.length - 1 ? "process" : "process",
      text: section.label,
    })),
    { id: "end", type: "terminator", text: "Publish" },
  ]
  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `e-${node.id}-${nodes[index + 1]?.id}`,
    sourceNodeId: node.id,
    targetNodeId: nodes[index + 1]?.id,
    label: index === 0 ? labels[0] : undefined,
  }))

  return {
    kind: "flowchart",
    schemaVersion: 1,
    metadata: {
      title: plan.title,
      description: `Fixture draft: ${plan.goal}`.slice(0, 400),
      sourceAssetIds: [],
    },
    nodes,
    edges,
  }
}

function failDraftOnce(prompt: string) {
  if (!prompt.toLowerCase().includes(FAIL_TOKEN)) return
  if (failedDrafts.has(prompt)) return
  failedDrafts.add(prompt)
  throw new GenerationError(
    "DOCUMENT_INVALID",
    "The fixture provider failed the draft on purpose. Retry to continue.",
    { status: 422, retryable: true }
  )
}

export { buildFixtureImage } from "./fixture-image"

export class FixtureModelProvider implements ModelProvider {
  readonly id = "fixture" as const

  async planFigure(input: PlanInput, signal: AbortSignal): Promise<FigurePlan> {
    signal.throwIfAborted()
    const sourceHint = [
      input.sourceText ? `Attached notes (${input.sourceText.name})` : "",
      input.sourceImage ? "Attached reference image" : "",
    ]
      .filter(Boolean)
      .join(". ")
    return buildFixturePlan(sourceHint ? `${input.prompt}. ${sourceHint}` : input.prompt)
  }

  async createFlowchart(input: GenerateFlowchartInput, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted()
    failDraftOnce(input.prompt)
    return buildFixtureFlowchart(input)
  }

  async reviseFlowchart(input: ReviseFlowchartInput, signal: AbortSignal): Promise<unknown> {
    signal.throwIfAborted()
    failDraftOnce(input.prompt)
    return buildFixtureFlowchart(input)
  }

  async createIllustration(input: GenerateImageInput, signal: AbortSignal): Promise<GeneratedImage> {
    signal.throwIfAborted()
    failDraftOnce(input.prompt)
    return buildFixtureImage(input, "illustration")
  }

  async reviseIllustration(input: GenerateImageInput, signal: AbortSignal): Promise<GeneratedImage> {
    signal.throwIfAborted()
    failDraftOnce(input.prompt)
    return buildFixtureImage(input, "illustration")
  }

  async createPlot(input: GenerateImageInput, signal: AbortSignal): Promise<GeneratedImage> {
    signal.throwIfAborted()
    failDraftOnce(input.prompt)
    return buildFixtureImage(input, "plot")
  }
}
