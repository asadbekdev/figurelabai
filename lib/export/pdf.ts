import { PDFDocument } from "pdf-lib"

import type { FlowchartDocument } from "@/lib/flowchart/schema"

import { createFlowchartPng } from "../flowchart/export"

const CSS_PX_TO_PT = 0.75

export type PdfImageInput = {
  bytes: Uint8Array
  mimeType: "image/png" | "image/jpeg"
  width: number
  height: number
  title?: string
}

export async function createImagePdf(input: PdfImageInput): Promise<Blob> {
  if (input.width <= 0 || input.height <= 0) {
    throw new Error("The PDF page size must be positive.")
  }
  const document = await PDFDocument.create()
  if (input.title) document.setTitle(input.title)
  document.setProducer("FigureLab")

  const image =
    input.mimeType === "image/png"
      ? await document.embedPng(input.bytes)
      : await document.embedJpg(input.bytes)

  const widthPt = Math.max(72, input.width * CSS_PX_TO_PT)
  const heightPt = Math.max(72, input.height * CSS_PX_TO_PT)
  const page = document.addPage([widthPt, heightPt])
  page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt })

  const bytes = await document.save()
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" })
}

export async function createFlowchartPdf(
  document: FlowchartDocument,
  options: { background: "document" | "transparent"; scale: 1 | 2 | 4 }
): Promise<Blob> {
  const png = await createFlowchartPng(document, {
    background: options.background,
    scale: options.scale,
  })
  const bytes = new Uint8Array(await png.arrayBuffer())
  return createImagePdf({
    bytes,
    mimeType: "image/png",
    width: document.page.width,
    height: document.page.height,
    title: document.metadata.title,
  })
}

export function dataUrlToBytes(dataUrl: string): { mimeType: string; bytes: Uint8Array } {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl)
  if (!match) throw new Error("The figure data could not be read.")
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return { mimeType: match[1], bytes }
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

export async function rasterizeDataUrl(dataUrl: string, scale = 2): Promise<{
  bytes: Uint8Array
  width: number
  height: number
}> {
  const image = await loadImageElement(dataUrl)
  const width = image.naturalWidth
  const height = image.naturalHeight
  if (!width || !height) throw new Error("The figure has no measurable size.")

  const canvas = window.document.createElement("canvas")
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext("2d", { alpha: true })
  if (!context) throw new Error("This browser cannot rasterize the figure.")

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.drawImage(image, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result && result.size > 0) resolve(result)
      else reject(new Error("The PNG encoder returned an empty file."))
    }, "image/png")
  })
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height }
}

export async function createPdfFromDataUrl(input: {
  dataUrl: string
  title?: string
}): Promise<Blob> {
  const { mimeType, bytes } = dataUrlToBytes(input.dataUrl)

  if (mimeType === "image/png" || mimeType === "image/jpeg") {
    const image = await loadImageElement(input.dataUrl)
    return createImagePdf({
      bytes,
      mimeType,
      width: image.naturalWidth || 1_280,
      height: image.naturalHeight || 720,
      title: input.title,
    })
  }

  const raster = await rasterizeDataUrl(input.dataUrl, 2)
  return createImagePdf({
    bytes: raster.bytes,
    mimeType: "image/png",
    width: raster.width,
    height: raster.height,
    title: input.title,
  })
}
