import { XMLValidator } from "fast-xml-parser"
import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { FixtureModelProvider } from "../../lib/generation/providers/fixture"
import { cloneFlowchartDocument } from "../../lib/flowchart/schema"
import { runFlowchartReadiness } from "../../lib/flowchart/readiness"
import {
  resolveFlowchartRevisionCompletion,
} from "../../lib/flowchart/revision-application"
import { renderFlowchartSvg } from "../../lib/flowchart/svg"
import { createJobRunner } from "../../lib/jobs/runner"
import { createMemoryJobStore } from "../../lib/jobs/store"
import {
  publicGenerationJob,
  type GenerationJob,
} from "../../lib/jobs/types"
import { createWorkspaceRepository } from "../../lib/product/workspace-repository"
import { createMemoryStorage } from "../../lib/product/workspace-storage"

async function waitForJob(
  get: (id: string) => Promise<GenerationJob | null>,
  id: string
): Promise<GenerationJob> {
  const started = Date.now()
  while (Date.now() - started < 3_000) {
    const job = await get(id)
    if (job?.status === "succeeded") return job
    if (job?.status === "failed" || job?.status === "canceled") {
      throw new Error(job.safeErrorMessage ?? `Job ended as ${job.status}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error("Timed out waiting for the core-flow fixture job")
}

describe("core flow", () => {
  it("plans, generates, edits, preserves a revision conflict, exports, and reloads", async () => {
    const provider = new FixtureModelProvider()
    const plan = await provider.planFigure(
      { prompt: "Collect sample, extract DNA, amplify target, analyze result" },
      new AbortController().signal
    )
    const runner = createJobRunner({
      store: createMemoryJobStore(),
      provider,
      stageDelayMs: 0,
    })
    const initial = await runner.create(
      {
        type: "initial_generation",
        prompt: plan.goal,
        plan,
        idempotencyKey: "core-flow-initial-job",
      },
      provider
    )
    const generated = await waitForJob(runner.get, initial.id)
    if (!generated.resultDocument) throw new Error("Expected a generated flowchart")

    const repository = createWorkspaceRepository(createMemoryStorage())
    const created = await repository.createProject({
      title: plan.title,
      mode: "flowchart",
      document: generated.resultDocument,
      source: "generation",
    })
    const manual = cloneFlowchartDocument(generated.resultDocument)
    manual.nodes[0] = { ...manual.nodes[0], text: "Prepare sample" }
    const saved = await repository.saveDocument(created.project.id, manual, 1, "autosave")
    if (!saved.ok) throw new Error("Expected the manual edit to save")

    const revisionJob = await runner.create(
      {
        type: "revision",
        prompt: "Add a quality-control note to the workflow",
        document: manual,
        baseRevision: saved.revision,
        projectId: created.project.id,
        idempotencyKey: "core-flow-revision-job",
      },
      provider
    )
    const newerManual = cloneFlowchartDocument(manual)
    newerManual.nodes[0] = {
      ...newerManual.nodes[0],
      text: "Prepare and barcode sample",
    }
    const revised = publicGenerationJob(await waitForJob(runner.get, revisionJob.id))
    if (!revised.resultDocument || !revised.baseDocumentChecksum) {
      throw new Error("Expected a revision result with its base fingerprint")
    }
    const completion = resolveFlowchartRevisionCompletion({
      baseRevision: revised.baseRevision,
      baseDocumentChecksum: revised.baseDocumentChecksum,
      currentRevision: saved.revision,
      currentDocument: newerManual,
      resultDocument: revised.resultDocument,
    })

    expect(completion.status).toBe("conflict")
    if (completion.status !== "conflict") throw new Error("Expected a revision conflict")
    expect(completion.currentDocument.nodes[0]?.text).toBe("Prepare and barcode sample")

    const report = runFlowchartReadiness(completion.currentDocument)
    expect(report.ready).toBe(true)
    const svg = renderFlowchartSvg(completion.currentDocument, { background: "document" })
    expect(XMLValidator.validate(svg)).toBe(true)
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    const pngMetadata = await sharp(png).metadata()
    expect(pngMetadata.format).toBe("png")
    expect(png.byteLength).toBeGreaterThan(1_000)

    const afterConflict = await repository.saveDocument(
      created.project.id,
      completion.currentDocument,
      saved.revision,
      "autosave"
    )
    if (!afterConflict.ok) throw new Error("Expected the preserved edit to save")
    const reopened = await repository.openProject(created.project.id)
    expect(reopened?.document?.revision).toBe(afterConflict.revision)
    expect(reopened?.document?.checksum).toBe(afterConflict.checksum)
    if (reopened?.document?.content.kind !== "flowchart") {
      throw new Error("Expected a reloaded flowchart")
    }
    expect(reopened.document.content.nodes[0]?.text).toBe("Prepare and barcode sample")
  })
})
