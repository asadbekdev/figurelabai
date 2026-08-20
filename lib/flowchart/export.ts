import type { FlowchartDocument } from "./schema"
import { renderFlowchartSvg, type FlowchartSvgOptions } from "./svg"

export type PngExportOptions = FlowchartSvgOptions & {
  scale: 1 | 2 | 4
}

function resolveBrowserColor(value: string): string {
  if (typeof window === "undefined" || !value.includes("var(")) return value

  const probe = window.document.createElement("span")
  probe.style.color = value
  probe.style.position = "fixed"
  probe.style.pointerEvents = "none"
  probe.style.opacity = "0"
  window.document.body.append(probe)
  const resolved = window.getComputedStyle(probe).color
  probe.remove()
  return resolved || value
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = "async"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("The SVG preview could not be decoded."))
    image.src = source
  })
}

function canvasHasVisibleContent(
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  const sampleWidth = Math.min(width, 320)
  const sampleHeight = Math.min(height, 240)
  const sampleCanvas = window.document.createElement("canvas")
  sampleCanvas.width = sampleWidth
  sampleCanvas.height = sampleHeight
  const sampleContext = sampleCanvas.getContext("2d", {
    willReadFrequently: true,
  })
  if (!sampleContext) return false

  sampleContext.drawImage(context.canvas, 0, 0, sampleWidth, sampleHeight)
  const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data
  const first = [pixels[0], pixels[1], pixels[2], pixels[3]]

  for (let index = 4; index < pixels.length; index += 4) {
    const visible = pixels[index + 3] > 0
    const differs =
      pixels[index] !== first[0] ||
      pixels[index + 1] !== first[1] ||
      pixels[index + 2] !== first[2] ||
      pixels[index + 3] !== first[3]
    if (visible && differs) return true
  }

  return false
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) resolve(blob)
      else reject(new Error("The PNG encoder returned an empty file."))
    }, "image/png")
  })
}

export function createFlowchartSvg(
  document: FlowchartDocument,
  options: FlowchartSvgOptions
): string {
  return renderFlowchartSvg(document, {
    ...options,
    resolveColor: options.resolveColor ?? resolveBrowserColor,
  })
}

export function validateFlowchartSvg(
  svg: string,
  document: FlowchartDocument
): void {
  if (typeof DOMParser === "undefined") {
    throw new Error("SVG validation requires a browser DOM parser.")
  }

  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml")
  if (parsed.querySelector("parsererror")) {
    throw new Error("The generated SVG is not valid XML.")
  }

  const root = parsed.documentElement
  if (root.localName !== "svg") {
    throw new Error("The generated artifact is not an SVG document.")
  }

  const viewBox = root.getAttribute("viewBox")
  if (
    viewBox !== `0 0 ${document.page.width} ${document.page.height}` &&
    viewBox !==
      `0 0 ${Number(document.page.width.toFixed(2))} ${Number(
        document.page.height.toFixed(2)
      )}`
  ) {
    throw new Error("The SVG viewBox does not match the document page.")
  }

  const exportedObjectIds = new Set(
    [...parsed.querySelectorAll("[data-object-id]")].map((element) =>
      element.getAttribute("data-object-id")
    )
  )

  for (const node of document.nodes) {
    if (!exportedObjectIds.has(node.id)) {
      throw new Error(`The SVG is missing node ${node.id}.`)
    }
  }

  for (const edge of document.edges) {
    if (!exportedObjectIds.has(edge.id)) {
      throw new Error(`The SVG is missing connection ${edge.id}.`)
    }
  }
}

export async function createFlowchartPng(
  document: FlowchartDocument,
  options: PngExportOptions
): Promise<Blob> {
  const width = Math.round(document.page.width * options.scale)
  const height = Math.round(document.page.height * options.scale)

  if (width > 32_768 || height > 32_768 || width * height > 100_000_000) {
    throw new Error("The requested PNG dimensions exceed the safe browser limit.")
  }

  const svg = createFlowchartSvg(document, options)
  validateFlowchartSvg(svg, document)
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
  const source = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(source)
    const canvas = window.document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext("2d", { alpha: true })
    if (!context) throw new Error("This browser cannot create a PNG canvas.")

    context.setTransform(options.scale, 0, 0, options.scale, 0, 0)
    context.drawImage(image, 0, 0, document.page.width, document.page.height)
    context.setTransform(1, 0, 0, 1, 0, 0)

    if (!canvasHasVisibleContent(context, width, height)) {
      throw new Error("The PNG validation detected a blank artifact.")
    }

    return await canvasToPng(canvas)
  } finally {
    URL.revokeObjectURL(source)
  }
}

export function downloadArtifact(blob: Blob, filename: string): void {
  const source = URL.createObjectURL(blob)
  const anchor = window.document.createElement("a")
  anchor.href = source
  anchor.download = filename
  anchor.hidden = true
  window.document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(source), 1_000)
}

export function exportFilename(title: string, extension: "svg" | "png"): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)

  return `${slug || "figurelab-flowchart"}.${extension}`
}
