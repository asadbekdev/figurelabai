export const imageOutputSizeSchema = ["1k", "2k", "4k"] as const
export type ImageOutputSize = (typeof imageOutputSizeSchema)[number]

export const IMAGE_OUTPUT_SIZES: Array<{
  value: ImageOutputSize
  label: string
  longEdge: number
  hint: string
}> = [
  { value: "1k", label: "1K", longEdge: 1024, hint: "Default generation size" },
  { value: "2k", label: "2K", longEdge: 2048, hint: "Long edge about 2048 px" },
  { value: "4k", label: "4K", longEdge: 4096, hint: "Long edge about 4096 px" },
]

export const UPSCALE_8K_LIMIT =
  "8K is not available. Gemini image models accept up to 4K, and the fixture provider only scales SVG to that size."

export function longEdgeForSize(size: ImageOutputSize | undefined): number {
  if (size === "4k") return 4096
  if (size === "2k") return 2048
  return 1024
}

export function geminiImageSize(size: ImageOutputSize | undefined): "1K" | "2K" | "4K" | undefined {
  if (size === "4k") return "4K"
  if (size === "2k") return "2K"
  if (size === "1k") return "1K"
  return undefined
}

function isGemini3HighResImageModel(model: string): boolean {
  if (model.includes("lite")) return false
  return (
    model.startsWith("gemini-3-pro-image") ||
    model.startsWith("gemini-3.1-flash-image") ||
    model === "nano-banana-pro-preview"
  )
}

/** Gemini 2.5 Flash Image (Nano Banana) is 1K only. Gemini 3 image models accept 1K/2K/4K. */
export function geminiImageSizeForModel(
  model: string,
  size: ImageOutputSize | undefined
): "1K" | "2K" | "4K" | undefined {
  const requested = geminiImageSize(size)
  if (!requested) return undefined
  if (requested === "1K") return "1K"
  if (isGemini3HighResImageModel(model)) return requested
  return "1K"
}

export function sizeForAspect(
  size: ImageOutputSize,
  aspect: "square" | "portrait" | "landscape" | "wide" | "auto" = "auto"
): { width: number; height: number } {
  const longEdge = longEdgeForSize(size)
  if (aspect === "square") return { width: longEdge, height: longEdge }
  if (aspect === "portrait") {
    return { width: Math.round(longEdge * 0.75), height: longEdge }
  }
  if (aspect === "wide") {
    return { width: longEdge, height: Math.round(longEdge * 9 / 16) }
  }
  return { width: longEdge, height: Math.round(longEdge * 0.75) }
}
