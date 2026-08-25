import { vectorObjectBounds, type Bounds } from "./objects"
import type { VectorObject } from "./schema"

export type SelectionRect = {
  x: number
  y: number
  width: number
  height: number
}

export function normalizeRect(
  a: { x: number; y: number },
  b: { x: number; y: number }
): SelectionRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

export function rectsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  )
}

export function objectsInRect(objects: VectorObject[], rect: SelectionRect): VectorObject[] {
  if (rect.width < 4 && rect.height < 4) return []
  return objects.filter((object) => rectsIntersect(vectorObjectBounds(object), rect))
}

export function toggleSelectedIds(current: string[], id: string): string[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

export function unionSelectedIds(current: string[], next: string[]): string[] {
  const seen = new Set(current)
  for (const id of next) seen.add(id)
  return [...seen]
}
