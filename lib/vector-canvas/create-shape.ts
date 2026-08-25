import { createVectorDocumentId, VECTOR_INK, type VectorObject } from "./schema"

export function createDrawnVectorObject(input: {
  tool: "rect" | "frame" | "ellipse" | "line"
  start: { x: number; y: number }
  end: { x: number; y: number }
  circle?: boolean
}): VectorObject | null {
  if (input.tool === "line") {
    const length = Math.hypot(input.end.x - input.start.x, input.end.y - input.start.y)
    if (length < 8) return null
    return {
      id: createVectorDocumentId(),
      type: "line",
      x1: input.start.x,
      y1: input.start.y,
      x2: input.end.x,
      y2: input.end.y,
      stroke: VECTOR_INK,
      strokeWidth: 2,
    }
  }

  const originX = Math.min(input.start.x, input.end.x)
  const originY = Math.min(input.start.y, input.end.y)
  let width = Math.abs(input.end.x - input.start.x)
  let height = Math.abs(input.end.y - input.start.y)
  if (input.circle) {
    const edge = Math.max(width, height)
    width = edge
    height = edge
  }
  if (width < 8 || height < 8) return null

  if (input.tool === "ellipse") {
    return {
      id: createVectorDocumentId(),
      type: "ellipse",
      x: originX,
      y: originY,
      width,
      height,
      stroke: VECTOR_INK,
    }
  }
  if (input.tool === "frame") {
    return {
      id: createVectorDocumentId(),
      type: "frame",
      x: originX,
      y: originY,
      width,
      height,
      stroke: VECTOR_INK,
    }
  }
  return {
    id: createVectorDocumentId(),
    type: "rect",
    x: originX,
    y: originY,
    width,
    height,
    fill: VECTOR_INK,
  }
}
