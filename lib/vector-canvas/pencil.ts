export type StrokePoint = { x: number; y: number }

export const PENCIL_MIN_DISTANCE = 1.5
export const PENCIL_HIT_PAD = 6

export function appendStrokePoint(points: StrokePoint[], point: StrokePoint): StrokePoint[] {
  const last = points.at(-1)
  if (!last) return [point]
  const dx = point.x - last.x
  const dy = point.y - last.y
  if (dx * dx + dy * dy < PENCIL_MIN_DISTANCE * PENCIL_MIN_DISTANCE) return points
  return [...points, point]
}

export function strokeToPath(points: StrokePoint[]): string {
  if (points.length === 0) return ""
  return points
    .map((point, index) => {
      const x = Number(point.x.toFixed(2))
      const y = Number(point.y.toFixed(2))
      return `${index === 0 ? "M" : "L"} ${x} ${y}`
    })
    .join(" ")
}

export function moveStrokePoints(points: StrokePoint[], dx: number, dy: number): StrokePoint[] {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }))
}

export function strokeBounds(points: StrokePoint[]): {
  x: number
  y: number
  width: number
  height: number
} {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return {
    x,
    y,
    width: Math.max(4, Math.max(...xs) - x),
    height: Math.max(4, Math.max(...ys) - y),
  }
}

function distanceToSegment(
  point: StrokePoint,
  start: StrokePoint,
  end: StrokePoint
): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = dx * dx + dy * dy
  if (length === 0) {
    const ox = point.x - start.x
    const oy = point.y - start.y
    return Math.hypot(ox, oy)
  }
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length))
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
}

export function pointHitsStroke(
  points: StrokePoint[],
  x: number,
  y: number,
  strokeWidth: number
): boolean {
  const threshold = strokeWidth / 2 + PENCIL_HIT_PAD
  const probe = { x, y }
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]
    const end = points[index]
    if (start && end && distanceToSegment(probe, start, end) <= threshold) return true
  }
  return false
}
