import type { IllustrationStyle, SourceImage } from "@/lib/generation/contracts"

export const illustrationInputModeSchema = [
  "text",
  "image",
  "sketch",
  "enhance",
  "reference",
] as const
export type IllustrationInputMode = (typeof illustrationInputModeSchema)[number]

export const illustrationInputModes: Array<{
  value: IllustrationInputMode
  label: string
  hint: string
}> = [
  { value: "text", label: "Text to Figure", hint: "Describe the figure" },
  { value: "image", label: "Image to Figure", hint: "Turn a photo or figure into a journal image" },
  { value: "sketch", label: "Sketch to Figure", hint: "Turn a sketch or whiteboard into a figure" },
  { value: "enhance", label: "Enhance Figure", hint: "Sharpen an existing figure" },
  { value: "reference", label: "Add Ref Figure", hint: "Match a reference for style and layout" },
]

export const ILLUSTRATION_STYLE_PRESETS: Record<
  IllustrationStyle,
  { label: string; hint: string; instruction: string }
> = {
  publication: {
    label: "Publication",
    hint: "Clean journal figure",
    instruction:
      "Create one clean scientific illustration suitable for a journal figure. No watermark, no logo, no decorative UI chrome, and no unreadable microtext.",
  },
  flat: {
    label: "Flat",
    hint: "Uniform fills, no shading",
    instruction:
      "Create one flat scientific figure: solid uniform fills, crisp outlines, no drop shadows, no realistic lighting, generous whitespace, short readable labels. No watermark, no logo, no decorative UI chrome.",
  },
  "2.5d": {
    label: "2.5D",
    hint: "Isometric depth",
    instruction:
      "Create one 2.5D isometric scientific figure: slight dimensional depth, consistent isometric angles, restrained shading, labeled parts, journal-ready composition. No watermark, no logo, no decorative UI chrome.",
  },
  "3d": {
    label: "3D",
    hint: "Volumetric rendering",
    instruction:
      "Create one 3D scientific figure: volumetric forms, soft studio lighting, accurate proportions, readable labels, publication-ready framing. No watermark, no logo, no decorative UI chrome.",
  },
  schematic: {
    label: "Schematic",
    hint: "Flat labeled diagram",
    instruction:
      "Create one flat schematic diagram for a scientific figure: crisp uniform outlines, clearly labeled parts, minimal shading, a technical-manual look. No watermark, no logo, no decorative UI chrome.",
  },
  soft: {
    label: "Soft",
    hint: "Gentle editorial rendering",
    instruction:
      "Create one soft editorial scientific illustration: gentle gradients, soft shading, and a calm muted palette while staying accurate. No watermark, no logo, no decorative UI chrome.",
  },
  sketch: {
    label: "Sketch",
    hint: "Pencil-study look",
    instruction:
      "Create one scientific illustration that reads as a refined pencil sketch: graphite line work, light hatching, paper-like background, readable labels. No watermark, no logo, no decorative UI chrome.",
  },
  "line-art": {
    label: "Line-Art",
    hint: "Ink outlines only",
    instruction:
      "Create one scientific illustration as high-contrast line art: uniform black ink outlines, no shading, no gradients, white or paper background, short labels. No watermark, no logo, no decorative UI chrome.",
  },
  "hand-drawn": {
    label: "Hand-Drawn",
    hint: "Ink-and-wash study",
    instruction:
      "Create one hand-drawn scientific figure: confident ink outlines, light watercolor or wash fills, slightly imperfect human marks, readable handwritten-style labels that stay legible. No watermark, no logo, no decorative UI chrome.",
  },
}

export const JOURNAL_PALETTE_PRESETS = [
  {
    id: "nature",
    label: "Nature",
    hint: "Muted teal and earth",
    colors: ["#0f766e", "#365314", "#a16207", "#1e293b", "#f8fafc"],
  },
  {
    id: "cell",
    label: "Cell",
    hint: "Navy and teal",
    colors: ["#1e3a8a", "#0e7490", "#155e75", "#334155", "#f8fafc"],
  },
  {
    id: "science",
    label: "Science",
    hint: "Warm red and gold",
    colors: ["#9f1239", "#b45309", "#1e3a8a", "#44403c", "#fffbeb"],
  },
  {
    id: "lancet",
    label: "Lancet",
    hint: "Deep teal and sand",
    colors: ["#115e59", "#b45309", "#1e293b", "#78716c", "#fafaf9"],
  },
  {
    id: "graphite",
    label: "Graphite",
    hint: "Neutral grayscale",
    colors: ["#18181b", "#52525b", "#a1a1aa", "#d4d4d8", "#ffffff"],
  },
] as const

export type JournalPaletteId = (typeof JOURNAL_PALETTE_PRESETS)[number]["id"]

export const ENHANCE_INSTRUCTION =
  "Enhance the attached figure: sharpen labels, clean edges, remove noise, and keep every scientific element, word, and layout in place. Do not invent new parts."

export const SKETCH_TO_FIGURE_INSTRUCTION =
  "Convert the attached sketch into a finished scientific figure. Preserve the composition, labels, and intended meaning. Replace rough marks with clean publication-ready drawing."

export const IMAGE_TO_FIGURE_INSTRUCTION =
  "Convert the attached image into a finished scientific figure. Preserve the subject, labels, and intended meaning. Replace photographic or messy rendering with clean publication-ready drawing."

export const REFERENCE_TO_FIGURE_INSTRUCTION =
  "Use the attached reference figure for visual language: palette, line weight, typography, icon language, and layout rhythm. Create a new figure that matches that look without copying it exactly."

export const FLOWCHART_AS_IMAGE_INSTRUCTION =
  "Draw this as a publication-style flowchart figure image: clear boxes, readable labels, consistent arrows, generous whitespace, journal-ready composition. This is a raster scientific figure, not a product UI mockup."

export const VISUAL_CONSISTENCY_INSTRUCTION =
  "Visual-consistency lock is on. Match the attached reference image for palette, line weight, typography, icon language, and overall look. Do not drift into a different visual style."

export function paletteInstruction(colors: string[]): string {
  if (colors.length === 0) return ""
  return `Use this extracted palette as the only document colors: ${colors.join(", ")}. Do not introduce unrelated hues.`
}

function alreadyHas(parts: string[], extra: string): boolean {
  const marker = extra.slice(0, 28)
  return parts.some((part) => part.includes(marker))
}

function appendUnique(parts: string[], extra: string) {
  if (!extra || alreadyHas(parts, extra)) return
  parts.push(extra)
}

export function illustrationNeedsSourceImage(
  inputMode: IllustrationInputMode,
  visualConsistency = false
): boolean {
  return inputMode !== "text" || visualConsistency
}

export function composeIllustrationPrompt(input: {
  prompt: string
  inputMode?: IllustrationInputMode
  visualConsistency?: boolean
  paletteColors?: string[]
  generateAsImage?: boolean
}): string {
  const parts = [input.prompt.trim()].filter(Boolean)
  if (input.inputMode === "enhance") appendUnique(parts, ENHANCE_INSTRUCTION)
  if (input.inputMode === "sketch") appendUnique(parts, SKETCH_TO_FIGURE_INSTRUCTION)
  if (input.inputMode === "image") appendUnique(parts, IMAGE_TO_FIGURE_INSTRUCTION)
  if (input.inputMode === "reference") appendUnique(parts, REFERENCE_TO_FIGURE_INSTRUCTION)
  if (input.generateAsImage) appendUnique(parts, FLOWCHART_AS_IMAGE_INSTRUCTION)
  if (input.visualConsistency || input.inputMode === "reference") {
    appendUnique(parts, VISUAL_CONSISTENCY_INSTRUCTION)
  }
  appendUnique(parts, paletteInstruction(input.paletteColors ?? []))
  return parts.filter(Boolean).join(" ")
}

export function illustrationSystemInstruction(style?: IllustrationStyle): string {
  return ILLUSTRATION_STYLE_PRESETS[style ?? "publication"].instruction
}

function channelToHex(value: number): string {
  return value.toString(16).padStart(2, "0")
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`
}

function quantize(value: number, step = 24): number {
  return Math.min(255, Math.round(value / step) * step)
}

export async function extractPaletteFromDataUrl(
  dataUrl: string,
  count = 5
): Promise<string[]> {
  if (typeof document === "undefined") {
    throw new Error("Palette extraction needs a browser canvas.")
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.decoding = "async"
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error("The reference image could not be decoded."))
    element.src = dataUrl
  })

  const width = Math.max(1, Math.min(96, image.naturalWidth || 96))
  const height = Math.max(
    1,
    Math.min(96, Math.round(((image.naturalHeight || 96) * width) / (image.naturalWidth || width)))
  )
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("This browser cannot sample the reference image.")
  context.drawImage(image, 0, 0, width, height)

  const pixels = context.getImageData(0, 0, width, height).data
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>()

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0
    if (alpha < 16) continue
    const r = quantize(pixels[index] ?? 0)
    const g = quantize(pixels[index + 1] ?? 0)
    const b = quantize(pixels[index + 2] ?? 0)
    const key = rgbToHex(r, g, b)
    const current = buckets.get(key)
    if (current) current.count += 1
    else buckets.set(key, { count: 1, r, g, b })
  }

  return [...buckets.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, count)
    .map((bucket) => rgbToHex(bucket.r, bucket.g, bucket.b))
}

export function sourceImageFromAttachment(image: SourceImage | undefined): SourceImage | undefined {
  return image
}
