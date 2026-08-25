export const VECTORIZE_PREPROCESS = ["auto", "none"] as const
export type VectorizePreprocess = (typeof VECTORIZE_PREPROCESS)[number]

export const VECTORIZE_DETAILS = ["draft", "balanced", "fine"] as const
export type VectorizeDetail = (typeof VECTORIZE_DETAILS)[number]

export const VECTORIZE_DETAIL_LABELS: Record<VectorizeDetail, { label: string; hint: string }> = {
  draft: { label: "Draft", hint: "Bold shapes, fewest paths" },
  balanced: { label: "Balanced", hint: "Everyday tracing" },
  fine: { label: "Fine", hint: "Keeps small details" },
}

// Artifact ink colors for the traced SVG. These are portable document colors,
// not app theme tokens (same rule as lib/flowchart/palette.ts).
export const VECTORIZE_INKS = [
  { id: "graphite", label: "Graphite", color: "#18181b" },
  { id: "navy", label: "Navy", color: "#1e3a8a" },
  { id: "crimson", label: "Crimson", color: "#7f1d1d" },
  { id: "forest", label: "Forest", color: "#14532d" },
] as const

export type VectorizeInkId = (typeof VECTORIZE_INKS)[number]["id"]

export type VectorizeResponse = {
  svg: string
  width: number
  height: number
  pathCount: number
}
