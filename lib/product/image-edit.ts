// Prompt builders for structured AI image edits. Palette colors are portable
// artifact colors (same rule as lib/flowchart/palette.ts), not app theme tokens.

export type EditRegion = {
  x: number
  y: number
  width: number
  height: number
}

export const RECOLOR_PALETTES = [
  {
    id: "graphite",
    label: "Graphite",
    hint: "Neutral grayscale",
    colors: ["#18181b", "#52525b", "#a1a1aa", "#ffffff"],
  },
  {
    id: "blueprint",
    label: "Blueprint",
    hint: "Blue accent family",
    colors: ["#1e3a8a", "#1e40af", "#93c5fd", "#ffffff"],
  },
  {
    id: "forest",
    label: "Forest",
    hint: "Muted greens",
    colors: ["#14532d", "#3f6212", "#bbf7d0", "#ffffff"],
  },
  {
    id: "ember",
    label: "Ember",
    hint: "Warm reds and ambers",
    colors: ["#7f1d1d", "#b45309", "#fed7aa", "#ffffff"],
  },
] as const

export type RecolorPaletteId = (typeof RECOLOR_PALETTES)[number]["id"]

export const ASPECT_EDIT_OPTIONS = [
  { value: "square", label: "Square", hint: "1:1" },
  { value: "portrait", label: "Portrait", hint: "3:4" },
  { value: "landscape", label: "Landscape", hint: "4:3" },
  { value: "wide", label: "Wide", hint: "16:9" },
] as const

export type AspectEditValue = (typeof ASPECT_EDIT_OPTIONS)[number]["value"]

export function recolorPrompt(palette: (typeof RECOLOR_PALETTES)[number]): string {
  return [
    `Recolor this figure to use only the ${palette.label} palette: ${palette.colors.join(", ")}.`,
    "Keep the layout, shapes, labels, and every word of text unchanged.",
    "Do not add or remove elements.",
  ].join(" ")
}

export const WHITE_BG_PROMPT = [
  "Place this artwork on a clean pure white background (#ffffff).",
  "Remove any colored, textured, gradient, or shaded backdrop.",
  "Keep all content, labels, and shapes unchanged.",
].join(" ")

export function aspectEditPrompt(ratio: AspectEditValue): string {
  const label = ASPECT_EDIT_OPTIONS.find((option) => option.value === ratio)?.label ?? ratio
  return [
    `Recompose this figure at a ${label} aspect ratio.`,
    "Keep all elements, labels, and meaning intact; rebalance spacing as needed.",
    "Do not crop away content.",
  ].join(" ")
}

export function textEditPrompt(instruction: string): string {
  return [
    `Edit the text in this figure: ${instruction.trim()}`,
    "Keep the layout, shapes, colors, and all other text unchanged.",
  ].join(" ")
}

export const UPSCALE_LIMIT =
  "Gemini redraws the figure at a larger size. It is not a dedicated 2× super-resolution upscaler."

export const UPSCALE_8K_LIMIT =
  "8K is not available. Gemini image models accept up to 4K, and the fixture provider only scales SVG to that size."

export type UpscaleSize = "2k" | "4k"

export function upscalePrompt(size: UpscaleSize = "2k"): string {
  const pixels = size === "4k" ? "4096" : "2048"
  const label = size === "4k" ? "4K" : "2K"
  return [
    `Redraw this figure at approximately ${pixels} px on the long edge (${label}), keeping every label, shape, and layout the same.`,
    "Sharpen edges and keep text readable.",
    UPSCALE_LIMIT,
  ].join(" ")
}

export const UPSCALE_PROMPT = upscalePrompt("2k")

export function regionRedrawPrompt(region: EditRegion, instruction: string): string {
  const left = Math.round(region.x * 100)
  const top = Math.round(region.y * 100)
  const width = Math.round(region.width * 100)
  const height = Math.round(region.height * 100)
  return [
    `Redraw only one region of this figure: the area starting about ${left}% from the left and ${top}% from the top, spanning about ${width}% of the width and ${height}% of the height.`,
    `In that region: ${instruction.trim()}`,
    "Keep everything outside that region unchanged.",
  ].join(" ")
}
