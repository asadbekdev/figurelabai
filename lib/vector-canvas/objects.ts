import { moveStrokePoints, pointHitsStroke, strokeBounds } from "./pencil"
import type { VectorObject } from "./schema"

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export function moveVectorObject(
  object: VectorObject,
  dx: number,
  dy: number
): VectorObject {
  if (object.type === "pencil") {
    return { ...object, points: moveStrokePoints(object.points, dx, dy) }
  }
  if (object.type === "line") {
    return {
      ...object,
      x1: object.x1 + dx,
      y1: object.y1 + dy,
      x2: object.x2 + dx,
      y2: object.y2 + dy,
    }
  }
  return { ...object, x: object.x + dx, y: object.y + dy }
}

export function moveVectorObjects(
  objects: VectorObject[],
  ids: Iterable<string>,
  dx: number,
  dy: number
): VectorObject[] {
  const selected = new Set(ids)
  return objects.map((object) =>
    selected.has(object.id) ? moveVectorObject(object, dx, dy) : object
  )
}

export function vectorObjectBounds(object: VectorObject): Bounds {
  if (object.type === "pencil") return strokeBounds(object.points)
  if (object.type === "line") {
    const x = Math.min(object.x1, object.x2)
    const y = Math.min(object.y1, object.y2)
    return {
      x,
      y,
      width: Math.max(4, Math.abs(object.x2 - object.x1)),
      height: Math.max(4, Math.abs(object.y2 - object.y1)),
    }
  }
  if (object.type === "text") {
    const width = Math.max(24, object.text.length * object.fontSize * 0.55)
    return {
      x: object.x,
      y: object.y - object.fontSize,
      width,
      height: object.fontSize + 4,
    }
  }
  return { x: object.x, y: object.y, width: object.width, height: object.height }
}

function pointHitsLine(
  object: Extract<VectorObject, { type: "line" }>,
  x: number,
  y: number
): boolean {
  return pointHitsStroke(
    [
      { x: object.x1, y: object.y1 },
      { x: object.x2, y: object.y2 },
    ],
    x,
    y,
    object.strokeWidth
  )
}

export function hitTestVectorObject(
  object: VectorObject,
  x: number,
  y: number
): boolean {
  if (object.type === "pencil") {
    return pointHitsStroke(object.points, x, y, object.strokeWidth)
  }
  if (object.type === "line") return pointHitsLine(object, x, y)
  const bounds = vectorObjectBounds(object)
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  )
}

export function hitTestTopVectorObject(
  objects: VectorObject[],
  x: number,
  y: number
): VectorObject | null {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const object = objects[index]
    if (object && hitTestVectorObject(object, x, y)) return object
  }
  return null
}

export function vectorObjectLabel(object: VectorObject): string {
  if (object.type === "text") return object.text
  if (object.type === "frame") return "Frame"
  if (object.type === "pencil") return "Pencil stroke"
  if (object.type === "line") return "Line"
  if (object.type === "ellipse") return "Ellipse"
  if (object.type === "image") return "Image"
  return "Rectangle"
}
