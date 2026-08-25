import { strokeToPath } from "./pencil"
import type { VectorDocument, VectorObject } from "./schema"
import { styleAttributes } from "./style"

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function num(value: number): string {
  return Number(value.toFixed(2)).toString()
}

export function renderVectorObjectSvg(object: VectorObject): string {
  if (object.type === "rect") {
    return `<rect data-object-id="${escapeXml(object.id)}" x="${num(object.x)}" y="${num(
      object.y
    )}" width="${num(object.width)}" height="${num(object.height)}" fill="${escapeXml(
      object.fill
    )}"${object.stroke ? ` stroke="${escapeXml(object.stroke)}" stroke-width="1.5"` : ""}${styleAttributes(object)} />`
  }

  if (object.type === "frame") {
    return `<rect data-object-id="${escapeXml(object.id)}" x="${num(object.x)}" y="${num(
      object.y
    )}" width="${num(object.width)}" height="${num(object.height)}" fill="none" stroke="${escapeXml(
      object.stroke
    )}" stroke-width="2"${object.fill ? ` fill="${escapeXml(object.fill)}"` : ""}${styleAttributes(object)} />`
  }

  if (object.type === "pencil") {
    return `<path data-object-id="${escapeXml(object.id)}" d="${escapeXml(
      strokeToPath(object.points)
    )}" fill="none" stroke="${escapeXml(object.stroke)}" stroke-width="${num(
      object.strokeWidth
    )}" stroke-linecap="round" stroke-linejoin="round"${styleAttributes(object)} />`
  }

  if (object.type === "line") {
    return `<line data-object-id="${escapeXml(object.id)}" x1="${num(object.x1)}" y1="${num(
      object.y1
    )}" x2="${num(object.x2)}" y2="${num(object.y2)}" stroke="${escapeXml(
      object.stroke
    )}" stroke-width="${num(object.strokeWidth)}" stroke-linecap="round"${styleAttributes(object)} />`
  }

  if (object.type === "ellipse") {
    return `<ellipse data-object-id="${escapeXml(object.id)}" cx="${num(
      object.x + object.width / 2
    )}" cy="${num(object.y + object.height / 2)}" rx="${num(object.width / 2)}" ry="${num(
      object.height / 2
    )}" fill="${escapeXml(object.fill ?? "none")}" stroke="${escapeXml(
      object.stroke
    )}" stroke-width="2"${styleAttributes(object)} />`
  }

  if (object.type === "image") {
    return `<image data-object-id="${escapeXml(object.id)}" href="${escapeXml(
      object.href
    )}" xlink:href="${escapeXml(object.href)}" x="${num(object.x)}" y="${num(
      object.y
    )}" width="${num(object.width)}" height="${num(
      object.height
    )}" preserveAspectRatio="xMidYMid meet"${styleAttributes(object)} />`
  }

  return `<text data-object-id="${escapeXml(object.id)}" x="${num(object.x)}" y="${num(
    object.y
  )}" font-family="-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, system-ui, sans-serif" font-size="${num(
    object.fontSize
  )}" fill="${escapeXml(object.fill)}"${styleAttributes(object)}>${escapeXml(object.text)}</text>`
}

export function renderVectorDocumentSvg(document: VectorDocument): string {
  const { width, height, background } = document.page
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(width)}" height="${num(
      height
    )}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-label="${escapeXml(
      document.title
    )}">`,
    `<rect width="100%" height="100%" fill="${escapeXml(background)}" />`,
  ]

  document.paths.forEach((path, index) => {
    parts.push(
      `<path data-path-index="${index}" d="${escapeXml(path.d)}" fill="${escapeXml(path.fill)}" />`
    )
  })

  for (const object of document.objects) {
    parts.push(renderVectorObjectSvg(object))
  }

  parts.push("</svg>")
  return parts.join("")
}

export function vectorDocumentDataUrl(document: VectorDocument): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderVectorDocumentSvg(document))}`
}
