import type { VectorObject } from "@/lib/vector-canvas/schema"

import { renderIllustrationSvg } from "./overlay"

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("The illustration could not be decoded."))
    image.src = source
  })
}

export async function createIllustrationPng(input: {
  title: string
  imageHref: string
  page: { width: number; height: number }
  objects: VectorObject[]
  scale?: 1 | 2 | 4
}): Promise<Blob> {
  return rasterizeIllustration(input, "image/png")
}

async function rasterizeIllustration(
  input: {
    title: string
    imageHref: string
    page: { width: number; height: number }
    objects: VectorObject[]
    scale?: 1 | 2 | 4
  },
  mimeType: "image/png" | "image/jpeg"
): Promise<Blob> {
  const scale = input.scale ?? 2
  const width = Math.round(input.page.width * scale)
  const height = Math.round(input.page.height * scale)
  const svg = renderIllustrationSvg(input)
  const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const image = await loadImage(source)
    const canvas = window.document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { alpha: mimeType === "image/png" })
    if (!context) throw new Error("This browser cannot create a raster canvas.")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.setTransform(scale, 0, 0, scale, 0, 0)
    context.drawImage(image, 0, 0, input.page.width, input.page.height)
    return await canvasToBlob(canvas, mimeType)
  } finally {
    URL.revokeObjectURL(source)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: "image/png" | "image/jpeg"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result && result.size > 0) resolve(result)
        else reject(new Error(`The ${mimeType === "image/jpeg" ? "JPG" : "PNG"} encoder returned an empty file.`))
      },
      mimeType,
      mimeType === "image/jpeg" ? 0.92 : undefined
    )
  })
}

export async function createIllustrationJpeg(input: {
  title: string
  imageHref: string
  page: { width: number; height: number }
  objects: VectorObject[]
  scale?: 1 | 2 | 4
}): Promise<Blob> {
  return rasterizeIllustration(input, "image/jpeg")
}

export async function createJpegFromDataUrl(dataUrl: string): Promise<Blob> {
  const image = await loadImage(dataUrl)
  const width = Math.max(1, image.naturalWidth || image.width)
  const height = Math.max(1, image.naturalHeight || image.height)
  const canvas = window.document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) throw new Error("This browser cannot create a JPG canvas.")
  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  return canvasToBlob(canvas, "image/jpeg")
}
