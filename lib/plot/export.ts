import { createImagePdf } from "@/lib/export/pdf"
import { createImagePptx } from "@/lib/export/pptx"

import { createPlotPython } from "./python"
import { renderPlotSvg } from "./render"
import type { PlotDocument } from "./schema"

export { createPlotPython }

export function createPlotSvg(document: PlotDocument): string {
  return renderPlotSvg(document)
}

export async function createPlotPng(
  document: PlotDocument,
  scale: 1 | 2 = 2
): Promise<Blob> {
  const svg = renderPlotSvg(document)
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.decoding = "async"
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error("The plot SVG could not be decoded."))
    element.src = source
  })

  const canvas = window.document.createElement("canvas")
  canvas.width = Math.round(document.page.width * scale)
  canvas.height = Math.round(document.page.height * scale)
  const context = canvas.getContext("2d", { alpha: true })
  if (!context) throw new Error("This browser cannot create a PNG canvas.")

  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.drawImage(image, 0, 0, document.page.width, document.page.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) resolve(blob)
      else reject(new Error("The PNG encoder returned an empty file."))
    }, "image/png")
  })
}

export async function createPlotJpg(
  document: PlotDocument,
  scale: 1 | 2 = 2
): Promise<Blob> {
  const svg = renderPlotSvg(document)
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.decoding = "async"
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error("The plot SVG could not be decoded."))
    element.src = source
  })

  const canvas = window.document.createElement("canvas")
  canvas.width = Math.round(document.page.width * scale)
  canvas.height = Math.round(document.page.height * scale)
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) throw new Error("This browser cannot create a JPG canvas.")

  context.fillStyle = document.page.background || "#ffffff"
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.setTransform(scale, 0, 0, scale, 0, 0)
  context.drawImage(image, 0, 0, document.page.width, document.page.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) resolve(blob)
        else reject(new Error("The JPG encoder returned an empty file."))
      },
      "image/jpeg",
      0.92
    )
  })
}

export async function createPlotPptx(
  document: PlotDocument,
  scale: 1 | 2 = 2
): Promise<Blob> {
  const png = await createPlotPng(document, scale)
  return createImagePptx({
    bytes: new Uint8Array(await png.arrayBuffer()),
    mimeType: "image/png",
    width: document.page.width,
    height: document.page.height,
    title: document.metadata.title,
  })
}

export async function createPlotPdf(
  document: PlotDocument,
  scale: 1 | 2 = 2
): Promise<Blob> {
  const png = await createPlotPng(document, scale)
  const bytes = new Uint8Array(await png.arrayBuffer())
  return createImagePdf({
    bytes,
    mimeType: "image/png",
    width: document.page.width,
    height: document.page.height,
    title: document.metadata.title,
  })
}
