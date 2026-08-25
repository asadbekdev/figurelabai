import type { FlowchartDocument } from "@/lib/flowchart/schema"

import { createFlowchartPng } from "../flowchart/export"
import { dataUrlToBytes, rasterizeDataUrl } from "./pdf"

export const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"

export type PptxImageInput = {
  bytes: Uint8Array
  mimeType: "image/png" | "image/jpeg"
  width: number
  height: number
  title?: string
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }

  let binary = ""
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0)
  }
  return btoa(binary)
}

function slideSizeInches(widthPx: number, heightPx: number): { width: number; height: number } {
  const maxWidth = 13.333
  const maxHeight = 7.5
  const aspect = widthPx / heightPx
  if (aspect >= maxWidth / maxHeight) {
    return { width: maxWidth, height: maxWidth / aspect }
  }
  return { width: maxHeight * aspect, height: maxHeight }
}

export async function createImagePptx(input: PptxImageInput): Promise<Blob> {
  if (input.width <= 0 || input.height <= 0) {
    throw new Error("The slide size must be positive.")
  }

  const { default: PptxGenJS } = await import("pptxgenjs")
  const presentation = new PptxGenJS()
  if (input.title) presentation.title = input.title
  presentation.author = "FigureLab"
  presentation.company = "FigureLab"

  const size = slideSizeInches(input.width, input.height)
  presentation.defineLayout({ name: "FIGURE", width: size.width, height: size.height })
  presentation.layout = "FIGURE"

  const slide = presentation.addSlide()
  slide.addImage({
    data: `data:${input.mimeType};base64,${bytesToBase64(input.bytes)}`,
    x: 0,
    y: 0,
    w: size.width,
    h: size.height,
  })

  const output = await presentation.write({ outputType: "arraybuffer" })
  return new Blob([output as ArrayBuffer], { type: PPTX_MIME })
}

export async function createFlowchartPptx(
  document: FlowchartDocument,
  options: { background: "document" | "transparent"; scale: 1 | 2 | 4 }
): Promise<Blob> {
  const png = await createFlowchartPng(document, options)
  return createImagePptx({
    bytes: new Uint8Array(await png.arrayBuffer()),
    mimeType: "image/png",
    width: document.page.width,
    height: document.page.height,
    title: document.metadata.title,
  })
}

export async function createPptxFromDataUrl(input: {
  dataUrl: string
  title?: string
}): Promise<Blob> {
  const { mimeType, bytes } = dataUrlToBytes(input.dataUrl)

  if (mimeType === "image/png" || mimeType === "image/jpeg") {
    const image = await loadImageElement(input.dataUrl)
    return createImagePptx({
      bytes,
      mimeType,
      width: image.naturalWidth || 1_280,
      height: image.naturalHeight || 720,
      title: input.title,
    })
  }

  const raster = await rasterizeDataUrl(input.dataUrl, 2)
  return createImagePptx({
    bytes: raster.bytes,
    mimeType: "image/png",
    width: raster.width,
    height: raster.height,
    title: input.title,
  })
}

function loadImageElement(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("The figure could not be decoded."))
    image.src = source
  })
}
