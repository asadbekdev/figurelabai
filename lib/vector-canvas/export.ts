import type { VectorDocument } from "./schema"
import { renderVectorDocumentSvg } from "./render"

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("The SVG preview could not be decoded."))
    image.src = source
  })
}

export async function createVectorPng(
  document: VectorDocument,
  scale: 1 | 2 | 4 = 2
): Promise<Blob> {
  const width = Math.round(document.page.width * scale)
  const height = Math.round(document.page.height * scale)
  const svg = renderVectorDocumentSvg(document)
  const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const image = await loadImage(source)
    const canvas = window.document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { alpha: true })
    if (!context) throw new Error("This browser cannot create a PNG canvas.")
    context.setTransform(scale, 0, 0, scale, 0, 0)
    context.drawImage(image, 0, 0, document.page.width, document.page.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result && result.size > 0) resolve(result)
        else reject(new Error("The PNG encoder returned an empty file."))
      }, "image/png")
    })
    return blob
  } finally {
    URL.revokeObjectURL(source)
  }
}

export async function createVectorJpg(
  document: VectorDocument,
  scale: 1 | 2 | 4 = 2
): Promise<Blob> {
  const width = Math.round(document.page.width * scale)
  const height = Math.round(document.page.height * scale)
  const svg = renderVectorDocumentSvg(document)
  const source = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const image = await loadImage(source)
    const canvas = window.document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { alpha: false })
    if (!context) throw new Error("This browser cannot create a JPG canvas.")
    context.fillStyle = "#ffffff"
    context.fillRect(0, 0, width, height)
    context.setTransform(scale, 0, 0, scale, 0, 0)
    context.drawImage(image, 0, 0, document.page.width, document.page.height)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result && result.size > 0) resolve(result)
          else reject(new Error("The JPG encoder returned an empty file."))
        },
        "image/jpeg",
        0.92
      )
    })
  } finally {
    URL.revokeObjectURL(source)
  }
}
