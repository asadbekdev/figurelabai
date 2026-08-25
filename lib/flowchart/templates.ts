import type { IllustrationStyle } from "../generation/contracts"
import { layoutFlowchartDocument } from "../generation/layout"

import {
  parseFlowchartDocument,
  type FlowchartDocument,
  type FlowchartEdge,
  type FlowchartNode,
} from "./schema"

// Template documents carry portable artifact colors (see lib/flowchart/palette.ts).
const ink = "#3f3f46"
const inkText = "#18181b"
const accentFill = "#eff6ff"
const accentStroke = "#1e40af"
const accentText = "#1e3a8a"
const edgeGray = "#52525b"

const baseNodeStyle: FlowchartNode["style"] = {
  fill: "#ffffff",
  stroke: ink,
  textColor: inkText,
  fontSize: 14,
  radius: 14,
  strokeWidth: 2,
}

function node(
  id: string,
  type: FlowchartNode["type"],
  text: string,
  style: Partial<FlowchartNode["style"]> = {},
  position = { x: 0, y: 0 }
): FlowchartNode {
  return {
    id,
    type,
    position,
    size:
      type === "decision"
        ? { width: 190, height: 120 }
        : type === "note"
          ? { width: 200, height: 84 }
          : { width: 190, height: 84 },
    text,
    style: { ...baseNodeStyle, ...style },
  }
}

function edge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  label?: string,
  options: { dashed?: boolean; arrow?: boolean } = {}
): FlowchartEdge {
  return {
    id,
    sourceNodeId,
    targetNodeId,
    type: "smoothstep",
    label,
    style: {
      color: edgeGray,
      width: 2,
      markerEnd: options.arrow === false ? "none" : "arrow",
      dashed: options.dashed ?? false,
    },
  }
}

function makeDocument(
  title: string,
  description: string,
  nodes: FlowchartNode[],
  edges: FlowchartEdge[],
  direction: "left-right" | "top-bottom" = "left-right",
  layout = true
): FlowchartDocument {
  const document = parseFlowchartDocument({
    kind: "flowchart",
    schemaVersion: 1,
    page: { width: 1_120, height: 720, background: "#ffffff", padding: 64 },
    viewport: { x: 0, y: 0, zoom: 0.82 },
    nodes,
    edges,
    metadata: { title, description, sourceAssetIds: [] },
  })
  return layout ? layoutFlowchartDocument(document, direction) : document
}

export type FlowchartTemplate = {
  id: string
  family: string
  title: string
  description: string
  build: () => FlowchartDocument
}

export const flowchartTemplates: FlowchartTemplate[] = [
  {
    id: "standard-workflow",
    family: "Flowchart",
    title: "Standard workflow",
    description: "Start, preparation, a quality gate, and analysis with a retry loop.",
    build: () =>
      makeDocument(
        "Standard workflow",
        "A general-purpose process with one decision gate.",
        [
          node("start", "terminator", "Start", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("prepare", "process", "Prepare sample"),
          node("qc", "decision", "QC pass?"),
          node("analyze", "process", "Run analysis"),
          node("publish", "terminator", "Publish figure", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
        ],
        [
          edge("e-start-prepare", "start", "prepare"),
          edge("e-prepare-qc", "prepare", "qc"),
          edge("e-qc-analyze", "qc", "analyze", "Yes"),
          edge("e-qc-prepare", "qc", "prepare", "No", { dashed: true }),
          edge("e-analyze-publish", "analyze", "publish"),
        ]
      ),
  },
  {
    id: "model-architecture",
    family: "Model architecture",
    title: "Model architecture",
    description: "Input, encoder, latent space, decoder, and output stages.",
    build: () =>
      makeDocument(
        "Model architecture",
        "A left-to-right neural architecture overview.",
        [
          node("input", "document", "Input data"),
          node("encoder", "process", "Encoder", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("latent", "process", "Latent representation"),
          node("decoder", "process", "Decoder", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("output", "terminator", "Output"),
          node("training-note", "note", "Trained end-to-end with held-out validation"),
        ],
        [
          edge("e-input-encoder", "input", "encoder"),
          edge("e-encoder-latent", "encoder", "latent"),
          edge("e-latent-decoder", "latent", "decoder"),
          edge("e-decoder-output", "decoder", "output"),
          edge("e-note-latent", "training-note", "latent", undefined, {
            dashed: true,
            arrow: false,
          }),
        ]
      ),
  },
  {
    id: "cycle-diagram",
    family: "Cycle diagram",
    title: "Experimental cycle",
    description: "Plan, execute, measure, and review as a closed loop.",
    build: () =>
      makeDocument(
        "Experimental cycle",
        "An iterative research loop.",
        [
          node("plan", "process", "Plan experiment", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("execute", "process", "Execute"),
          node("measure", "process", "Measure outcomes"),
          node("review", "decision", "Hypothesis holds?"),
        ],
        [
          edge("e-plan-execute", "plan", "execute"),
          edge("e-execute-measure", "execute", "measure"),
          edge("e-measure-review", "measure", "review"),
          edge("e-review-plan", "review", "plan", "Refine", { dashed: true }),
        ]
      ),
  },
  {
    id: "timeline",
    family: "Timeline",
    title: "Study timeline",
    description: "Screening to analysis as sequential study phases.",
    build: () =>
      makeDocument(
        "Study timeline",
        "Phase-by-phase clinical or longitudinal study plan.",
        [
          node("screening", "terminator", "Screening"),
          node("baseline", "process", "Baseline visit", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("intervention", "process", "Intervention"),
          node("follow-up", "process", "Follow-up", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("analysis", "terminator", "Analysis"),
        ],
        [
          edge("e-screen-baseline", "screening", "baseline", "Week 0"),
          edge("e-baseline-intervention", "baseline", "intervention", "Weeks 1–4"),
          edge("e-intervention-follow", "intervention", "follow-up", "Weeks 5–12"),
          edge("e-follow-analysis", "follow-up", "analysis"),
        ]
      ),
  },
  {
    id: "prisma-screening",
    family: "PRISMA",
    title: "PRISMA screening",
    description: "Identification, screening, eligibility, and inclusion with exclusions.",
    build: () =>
      makeDocument(
        "PRISMA screening",
        "Systematic-review screening flow with exclusion branches.",
        [
          node("identified", "document", "Records identified (n = )", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("deduplicated", "process", "After duplicates removed (n = )"),
          node("screened", "process", "Titles and abstracts screened (n = )"),
          node("excluded-screen", "note", "Records excluded (n = )"),
          node("assessed", "process", "Full texts assessed (n = )"),
          node("excluded-full", "note", "Full texts excluded, with reasons (n = )"),
          node("included", "terminator", "Studies included (n = )", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
        ],
        [
          edge("e-id-dedup", "identified", "deduplicated"),
          edge("e-dedup-screen", "deduplicated", "screened"),
          edge("e-screen-excluded", "screened", "excluded-screen", undefined, {
            dashed: true,
          }),
          edge("e-screen-assessed", "screened", "assessed"),
          edge("e-assessed-excluded", "assessed", "excluded-full", undefined, {
            dashed: true,
          }),
          edge("e-assessed-included", "assessed", "included"),
        ],
        "top-bottom"
      ),
  },
  {
    id: "consort-flow",
    family: "CONSORT",
    title: "CONSORT flow",
    description: "Enrollment, allocation, follow-up, and analysis for a two-arm trial.",
    build: () =>
      makeDocument(
        "CONSORT flow",
        "CONSORT 2010-style participant flow with two arms.",
        [
          node("assessed", "document", "Assessed for eligibility (n = )", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("excluded", "note", "Excluded (n = ), not eligible / declined / other"),
          node("randomized", "process", "Randomized (n = )"),
          node("alloc-int", "process", "Allocated to intervention (n = )", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("alloc-ctrl", "process", "Allocated to control (n = )"),
          node("lost-int", "note", "Lost to follow-up or discontinued (n = )"),
          node("lost-ctrl", "note", "Lost to follow-up or discontinued (n = )"),
          node("analyzed-int", "terminator", "Analyzed (n = )", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }),
          node("analyzed-ctrl", "terminator", "Analyzed (n = )"),
        ],
        [
          edge("e-assessed-excluded", "assessed", "excluded", undefined, { dashed: true }),
          edge("e-assessed-rand", "assessed", "randomized"),
          edge("e-rand-int", "randomized", "alloc-int"),
          edge("e-rand-ctrl", "randomized", "alloc-ctrl"),
          edge("e-int-lost", "alloc-int", "lost-int", undefined, { dashed: true }),
          edge("e-ctrl-lost", "alloc-ctrl", "lost-ctrl", undefined, { dashed: true }),
          edge("e-int-analyzed", "alloc-int", "analyzed-int"),
          edge("e-ctrl-analyzed", "alloc-ctrl", "analyzed-ctrl"),
        ],
        "top-bottom"
      ),
  },
  {
    id: "fishbone",
    family: "Fishbone",
    title: "Fishbone cause and effect",
    description: "Category bones feeding a central spine toward an effect.",
    build: () =>
      makeDocument(
        "Fishbone cause and effect",
        "Ishikawa-style causes grouped by category.",
        [
          node("spine-1", "process", "Materials", { radius: 6 }, { x: 120, y: 330 }),
          node("spine-2", "process", "Methods", { radius: 6 }, { x: 420, y: 330 }),
          node("spine-3", "process", "Environment", { radius: 6 }, { x: 720, y: 330 }),
          node("effect", "terminator", "Observed effect", {
            fill: accentFill,
            stroke: accentStroke,
            textColor: accentText,
          }, { x: 1_020, y: 330 }),
          node("cause-a", "note", "Reagent batch", {}, { x: 120, y: 150 }),
          node("cause-b", "note", "Protocol drift", {}, { x: 420, y: 150 }),
          node("cause-c", "note", "Temperature swings", {}, { x: 720, y: 150 }),
          node("cause-d", "note", "Operator variance", {}, { x: 270, y: 520 }),
          node("cause-e", "note", "Instrument calibration", {}, { x: 570, y: 520 }),
        ],
        [
          edge("e-s1-s2", "spine-1", "spine-2"),
          edge("e-s2-s3", "spine-2", "spine-3"),
          edge("e-s3-effect", "spine-3", "effect"),
          edge("e-a-s1", "cause-a", "spine-1", undefined, { arrow: false }),
          edge("e-b-s2", "cause-b", "spine-2", undefined, { arrow: false }),
          edge("e-c-s3", "cause-c", "spine-3", undefined, { arrow: false }),
          edge("e-d-s1", "cause-d", "spine-2", undefined, { arrow: false }),
          edge("e-e-s2", "cause-e", "spine-3", undefined, { arrow: false }),
        ],
        "left-right",
        false
      ),
  },
]

export type IllustrationStarter = {
  id: string
  title: string
  description: string
  prompt: string
  style?: IllustrationStyle
}

export const illustrationStarters: IllustrationStarter[] = [
  {
    id: "graphical-abstract",
    title: "Graphical abstract",
    description: "A single-glance summary panel for a paper.",
    prompt:
      "Create a graphical abstract for a cell-biology paper: a clean left-to-right composition showing a sample becoming a treated culture and then a measured result, flat publication style, generous whitespace, no decorative text.",
    style: "publication",
  },
  {
    id: "pathway-schematic",
    title: "Pathway schematic",
    description: "A flat labeled signaling or metabolic pathway.",
    prompt:
      "Draw a flat schematic of a signaling pathway: a ligand binding a membrane receptor, three labeled intracellular steps, and a nuclear response. Crisp uniform outlines, clearly labeled parts, technical-manual look.",
    style: "schematic",
  },
  {
    id: "experiment-setup",
    title: "Experiment setup",
    description: "A soft editorial rendering of bench apparatus.",
    prompt:
      "Illustrate a bench-top experiment setup with labeled glassware and sensors in a soft editorial style: gentle gradients, calm muted palette, accurate proportions, no watermark.",
    style: "soft",
  },
  {
    id: "mechanism-diagram",
    title: "Mechanism diagram",
    description: "A clean mechanism-of-action figure for a journal.",
    prompt:
      "Create a clean mechanism-of-action illustration for a journal figure: a drug crossing a cell membrane, binding its target, and triggering a downstream effect, with arrows and short labels. No decorative UI chrome.",
    style: "line-art",
  },
  {
    id: "flat-workflow",
    title: "Flat workflow",
    description: "A Flat-style journal panel of a lab process.",
    prompt:
      "Create a flat scientific figure of a three-step sample-to-result workflow: solid fills, crisp outlines, no shadows, short labels, generous whitespace, journal-ready.",
    style: "flat",
  },
  {
    id: "isometric-setup",
    title: "2.5D lab setup",
    description: "An isometric bench apparatus figure.",
    prompt:
      "Create a 2.5D isometric scientific figure of a labeled bench setup: culture flask, pipette, and plate reader, consistent isometric angles, restrained shading.",
    style: "2.5d",
  },
  {
    id: "hand-drawn-cycle",
    title: "Hand-drawn cycle",
    description: "An ink-and-wash cell-cycle figure.",
    prompt:
      "Create a hand-drawn scientific figure of a four-stage cell cycle: confident ink outlines, light wash fills, readable labels, paper-like background.",
    style: "hand-drawn",
  },
]
