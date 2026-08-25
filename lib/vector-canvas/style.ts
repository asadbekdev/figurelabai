import type { VectorObject } from "./schema"

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function isHexColor(value: string): boolean {
  return HEX.test(value.trim())
}

export function normalizeHex(value: string): string | null {
  const next = value.trim()
  if (!HEX.test(next)) return null
  if (next.length === 4) {
    const [, r, g, b] = next
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return next.toLowerCase()
}

export function vectorObjectFill(object: VectorObject): string | null {
  if ("fill" in object && typeof object.fill === "string") return object.fill
  return null
}

export function vectorObjectStroke(object: VectorObject): string | null {
  if ("stroke" in object && typeof object.stroke === "string") return object.stroke
  return null
}

export function vectorObjectOpacity(object: VectorObject): number {
  return object.opacity ?? 1
}

export function vectorObjectDash(object: VectorObject): number {
  return object.dash ?? 0
}

export function vectorObjectStrokeWidth(object: VectorObject): number | null {
  if ("strokeWidth" in object && typeof object.strokeWidth === "number") {
    return object.strokeWidth
  }
  return null
}

export function patchVectorObjectStyle(
  object: VectorObject,
  patch: {
    fill?: string
    stroke?: string
    opacity?: number
    dash?: number
    strokeWidth?: number
  }
): VectorObject {
  const next = { ...object }
  if (patch.opacity !== undefined) next.opacity = Math.min(1, Math.max(0, patch.opacity))
  if (patch.dash !== undefined) next.dash = Math.min(48, Math.max(0, patch.dash))
  if (patch.strokeWidth !== undefined && "strokeWidth" in next) {
    next.strokeWidth = Math.min(24, Math.max(0.5, patch.strokeWidth))
  }
  if (patch.fill && "fill" in next) next.fill = patch.fill
  if (patch.stroke && "stroke" in next) next.stroke = patch.stroke
  if (patch.fill && !("fill" in next) && next.type === "ellipse") {
    return { ...next, fill: patch.fill }
  }
  if (patch.stroke && !("stroke" in next) && next.type === "rect") {
    return { ...next, stroke: patch.stroke }
  }
  return next
}

export function styleAttributes(object: {
  opacity?: number
  dash?: number
}): string {
  const parts: string[] = []
  if (object.opacity !== undefined && object.opacity < 1) {
    parts.push(`opacity="${Number(object.opacity.toFixed(3))}"`)
  }
  if (object.dash && object.dash > 0) {
    parts.push(`stroke-dasharray="${object.dash} ${object.dash}"`)
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : ""
}
