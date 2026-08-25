import { createVectorDocumentId, type VectorObject } from "./schema"

export const CANVAS_IMAGE_MAX_BYTES = 800_000
export const CANVAS_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

export function canvasImageError(file: File): string | null {
  if (!CANVAS_IMAGE_TYPES.has(file.type)) {
    return "Use a PNG, JPEG, WebP, or GIF. SVG uploads are not placed as canvas objects."
  }
  if (file.size > CANVAS_IMAGE_MAX_BYTES) {
    return `That image is ${Math.ceil(file.size / 1024)} KB. Keep uploads under ${Math.floor(CANVAS_IMAGE_MAX_BYTES / 1024)} KB so the project can persist in this browser.`
  }
  return null
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("The image could not be read."))
    }
    reader.onerror = () => reject(new Error("The image could not be read."))
    reader.readAsDataURL(file)
  })
}

function measureDataUrl(href: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const width = image.naturalWidth
      const height = image.naturalHeight
      if (!width || !height) reject(new Error("The image has no measurable size."))
      else resolve({ width, height })
    }
    image.onerror = () => reject(new Error("The image could not be decoded."))
    image.src = href
  })
}

export async function vectorImageFromFile(
  file: File,
  origin: { x: number; y: number }
): Promise<VectorObject> {
  const invalid = canvasImageError(file)
  if (invalid) throw new Error(invalid)

  const href = await readFileAsDataUrl(file)
  const natural = await measureDataUrl(href)
  const maxEdge = 320
  const scale = Math.min(1, maxEdge / Math.max(natural.width, natural.height))
  const width = Math.max(8, Math.round(natural.width * scale))
  const height = Math.max(8, Math.round(natural.height * scale))

  return {
    id: createVectorDocumentId(),
    type: "image",
    x: origin.x,
    y: origin.y,
    width,
    height,
    href,
  }
}
