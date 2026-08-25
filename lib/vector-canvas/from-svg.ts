import {
  createVectorDocumentId,
  nowIso,
  parseVectorDocument,
  VECTOR_INK,
  type VectorDocument,
  type VectorObject,
  type VectorPath,
} from "./schema"

function decodeXml(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
}

function decodeBase64Utf8(data: string): string {
  const binary = atob(data)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function svgMarkupFromDataUrl(source: string): string | null {
  const trimmed = source.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("<")) return trimmed

  const dataUrl = /^data:image\/svg\+xml([^,]*),([\s\S]+)$/i.exec(trimmed)
  if (!dataUrl) return null
  const meta = dataUrl[1] ?? ""
  const payload = dataUrl[2] ?? ""
  try {
    return /base64/i.test(meta) ? decodeBase64Utf8(payload) : decodeURIComponent(payload)
  } catch {
    return null
  }
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`, "i").exec(tag)
  return match ? decodeXml(match[1]) : null
}

function numericAttribute(tag: string, name: string, fallback: number): number {
  const raw = attribute(tag, name)
  if (!raw) return fallback
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseLength(raw: string | null, fallback: number, percentOf?: number): number {
  if (!raw) return fallback
  if (raw.endsWith("%") && percentOf != null) {
    const percent = Number.parseFloat(raw)
    return Number.isFinite(percent) ? (percent / 100) * percentOf : fallback
  }
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

function isPaintNone(value: string | null): value is null {
  return !value || value === "none" || value === "transparent"
}

function paint(value: string | null, fallback = VECTOR_INK): string {
  if (isPaintNone(value)) return fallback
  return value
}

function optionalPaint(value: string | null): string | undefined {
  if (isPaintNone(value)) return undefined
  return value
}

function clampSize(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.max(8, Math.min(8_000, value))
}

function collectTags(svg: string, name: string): string[] {
  const tags: string[] = []
  const pattern = new RegExp(`<${name}\\b[^>]*>`, "gi")
  let match: RegExpExecArray | null
  while ((match = pattern.exec(svg))) {
    tags.push(match[0])
  }
  return tags
}

function isFullPageRect(
  tag: string,
  pageWidth: number,
  pageHeight: number
): { fill: string } | null {
  const widthRaw = attribute(tag, "width")
  const heightRaw = attribute(tag, "height")
  const x = parseLength(attribute(tag, "x"), 0, pageWidth)
  const y = parseLength(attribute(tag, "y"), 0, pageHeight)
  const width = parseLength(widthRaw, 0, pageWidth)
  const height = parseLength(heightRaw, 0, pageHeight)
  const coversPage =
    (widthRaw === "100%" && heightRaw === "100%") ||
    (width >= pageWidth - 1 && height >= pageHeight - 1 && x <= 1 && y <= 1)
  if (!coversPage) return null
  const fill = attribute(tag, "fill")
  return { fill: isPaintNone(fill) ? "#ffffff" : (fill ?? "#ffffff") }
}

export function vectorDocumentFromSvg(input: {
  svg: string
  title: string
  id?: string
  createdAt?: string
}): VectorDocument {
  const markup = svgMarkupFromDataUrl(input.svg) ?? input.svg
  const svgTag = /<svg\b[^>]*>/i.exec(markup)?.[0] ?? "<svg>"
  const viewBox = attribute(svgTag, "viewBox")?.split(/[\s,]+/).map(Number)
  const width = viewBox?.[2] && Number.isFinite(viewBox[2])
    ? viewBox[2]
    : numericAttribute(svgTag, "width", 960)
  const height = viewBox?.[3] && Number.isFinite(viewBox[3])
    ? viewBox[3]
    : numericAttribute(svgTag, "height", 540)
  const pageWidth = clampSize(width, 960)
  const pageHeight = clampSize(height, 540)

  const paths: VectorPath[] = []
  const objects: VectorObject[] = []
  let background = "#ffffff"

  for (const tag of collectTags(markup, "path")) {
    const d = attribute(tag, "d")
    if (!d) continue
    paths.push({
      d,
      fill: paint(attribute(tag, "fill") ?? attribute(tag, "stroke")),
    })
  }

  for (const tag of collectTags(markup, "rect")) {
    const pageFill = isFullPageRect(tag, pageWidth, pageHeight)
    if (pageFill) {
      background = pageFill.fill
      continue
    }
    const x = parseLength(attribute(tag, "x"), 0, pageWidth)
    const y = parseLength(attribute(tag, "y"), 0, pageHeight)
    const rectWidth = parseLength(attribute(tag, "width"), 0, pageWidth)
    const rectHeight = parseLength(attribute(tag, "height"), 0, pageHeight)
    if (rectWidth < 4 || rectHeight < 4) continue
    const fill = attribute(tag, "fill")
    const stroke = optionalPaint(attribute(tag, "stroke"))
    objects.push({
      id: createVectorDocumentId(),
      type: "rect",
      x,
      y,
      width: Math.min(4_000, rectWidth),
      height: Math.min(4_000, rectHeight),
      fill: paint(fill),
      ...(stroke ? { stroke } : {}),
    })
  }

  for (const tag of collectTags(markup, "circle")) {
    const cx = numericAttribute(tag, "cx", 0)
    const cy = numericAttribute(tag, "cy", 0)
    const radius = numericAttribute(tag, "r", 0)
    const size = Math.min(4_000, radius * 2)
    if (size < 4) continue
    const fill = optionalPaint(attribute(tag, "fill"))
    const stroke = attribute(tag, "stroke")
    objects.push({
      id: createVectorDocumentId(),
      type: "ellipse",
      x: cx - radius,
      y: cy - radius,
      width: size,
      height: size,
      stroke: paint(stroke, fill ?? VECTOR_INK),
      ...(fill ? { fill } : {}),
    })
  }

  for (const tag of collectTags(markup, "ellipse")) {
    const cx = numericAttribute(tag, "cx", 0)
    const cy = numericAttribute(tag, "cy", 0)
    const rx = numericAttribute(tag, "rx", 0)
    const ry = numericAttribute(tag, "ry", 0)
    const ellipseWidth = Math.min(4_000, rx * 2)
    const ellipseHeight = Math.min(4_000, ry * 2)
    if (ellipseWidth < 4 || ellipseHeight < 4) continue
    const fill = optionalPaint(attribute(tag, "fill"))
    const stroke = attribute(tag, "stroke")
    objects.push({
      id: createVectorDocumentId(),
      type: "ellipse",
      x: cx - rx,
      y: cy - ry,
      width: ellipseWidth,
      height: ellipseHeight,
      stroke: paint(stroke, fill ?? VECTOR_INK),
      ...(fill ? { fill } : {}),
    })
  }

  for (const tag of collectTags(markup, "line")) {
    const x1 = numericAttribute(tag, "x1", 0)
    const y1 = numericAttribute(tag, "y1", 0)
    const x2 = numericAttribute(tag, "x2", 0)
    const y2 = numericAttribute(tag, "y2", 0)
    if (Math.hypot(x2 - x1, y2 - y1) < 8) continue
    objects.push({
      id: createVectorDocumentId(),
      type: "line",
      x1,
      y1,
      x2,
      y2,
      stroke: paint(attribute(tag, "stroke")),
      strokeWidth: Math.min(24, Math.max(0.5, numericAttribute(tag, "stroke-width", 2))),
    })
  }

  const textPattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi
  let textMatch: RegExpExecArray | null
  while ((textMatch = textPattern.exec(markup))) {
    const tag = `<text${textMatch[1]}>`
    const text = decodeXml(textMatch[2] ?? "")
      .replace(/<[^>]+>/g, "")
      .trim()
      .slice(0, 400)
    if (!text) continue
    objects.push({
      id: createVectorDocumentId(),
      type: "text",
      x: numericAttribute(tag, "x", 0),
      y: numericAttribute(tag, "y", 24),
      text,
      fill: paint(attribute(tag, "fill")),
      fontSize: Math.min(72, Math.max(10, numericAttribute(tag, "font-size", 16))),
    })
  }

  if (paths.length === 0 && objects.length === 0) {
    throw new Error("That SVG has no paths or shapes to keep as a vector document.")
  }

  const timestamp = input.createdAt ?? nowIso()
  return parseVectorDocument({
    kind: "vector",
    schemaVersion: 1,
    id: input.id ?? createVectorDocumentId(),
    title: input.title.slice(0, 300) || "Vector figure",
    page: {
      width: pageWidth,
      height: pageHeight,
      background,
    },
    paths,
    objects,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}
