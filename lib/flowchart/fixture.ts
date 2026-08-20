import {
  parseFlowchartDocument,
  type FlowchartDocument,
  type FlowchartEdge,
  type FlowchartNode,
} from "./schema"

// Publication-style palette: ink outlines on white with a single blue
// accent family. Document colors are portable artifact data, not UI tokens.
const ink = "#3f3f46"
const inkText = "#18181b"
const accentFill = "#eff6ff"
const accentStroke = "#1e40af"
const accentText = "#1e3a8a"

const defaultNodeStyle: FlowchartNode["style"] = {
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
  x: number,
  y: number,
  style: Partial<FlowchartNode["style"]> = {}
): FlowchartNode {
  return {
    id,
    type,
    position: { x, y },
    size: type === "decision" ? { width: 180, height: 120 } : { width: 180, height: 84 },
    text,
    style: { ...defaultNodeStyle, ...style },
  }
}

function edge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  label?: string
): FlowchartEdge {
  return {
    id,
    sourceNodeId,
    targetNodeId,
    type: "smoothstep",
    label,
    style: {
      color: "#52525b",
      width: 2,
      markerEnd: "arrow",
      dashed: false,
    },
  }
}

export const demoFlowchartDocument: FlowchartDocument = parseFlowchartDocument({
  kind: "flowchart",
  schemaVersion: 1,
  page: {
    width: 1_120,
    height: 720,
    background: "#ffffff",
    padding: 64,
  },
  viewport: {
    x: 0,
    y: 0,
    zoom: 0.82,
  },
  nodes: [
    node("sample", "terminator", "Sample collection", 80, 248, {
      fill: accentFill,
      stroke: accentStroke,
      textColor: accentText,
      radius: 42,
    }),
    node("extract", "process", "Extract nucleic acid", 330, 248),
    node("quality", "decision", "Quality threshold met?", 580, 230, {
      radius: 0,
    }),
    node("amplify", "process", "Amplify target region", 840, 120),
    node("repeat", "note", "Repeat extraction", 590, 440, {
      fill: "#fafafa",
      stroke: "#a1a1aa",
      textColor: "#52525b",
      radius: 8,
    }),
    node("analysis", "terminator", "Analyze and report", 840, 360, {
      fill: accentFill,
      stroke: accentStroke,
      textColor: accentText,
      radius: 42,
    }),
  ],
  edges: [
    edge("sample-extract", "sample", "extract"),
    edge("extract-quality", "extract", "quality"),
    edge("quality-amplify", "quality", "amplify", "Yes"),
    edge("quality-repeat", "quality", "repeat", "No"),
    edge("repeat-extract", "repeat", "extract"),
    edge("amplify-analysis", "amplify", "analysis"),
  ],
  metadata: {
    title: "PCR sample-to-analysis workflow",
    description: "Deterministic local fixture for the FigureLab flowchart editor.",
    sourceAssetIds: [],
  },
})
