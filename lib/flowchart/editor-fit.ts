import type { FitViewOptions, Node, Rect, Viewport } from "@xyflow/react"

export const COMPACT_EDITOR_WIDTH = 640

export function shouldRefitEditor(announcement: string): boolean {
  return (
    announcement === "Revised flowchart loaded" ||
    announcement === "Imported flowchart loaded" ||
    announcement.startsWith("Auto-layout ")
  )
}

export function editorFitViewOptions<NodeType extends Node = Node>(
  width: number | undefined,
  duration: number
): FitViewOptions<NodeType> {
  const compact = width !== undefined && width < COMPACT_EDITOR_WIDTH

  return {
    duration,
    padding: compact ? 0.1 : 0.18,
    // Fit is an editing action, so text must remain legible even when the full
    // diagram is taller or wider than the canvas. Users can still zoom out to
    // the React Flow global minimum deliberately when they need an overview.
    minZoom: compact ? 0.6 : 0.75,
    maxZoom: compact ? 0.9 : 1.25,
  }
}

export function anchoredEditorViewport(input: {
  size: { width: number; height: number }
  bounds: Rect
  viewport: Viewport
}): Viewport | null {
  const { size, bounds, viewport } = input
  const compact = size.width < COMPACT_EDITOR_WIDTH
  const horizontalOverflow = bounds.width * viewport.zoom > size.width - 32
  const verticalOverflow = bounds.height * viewport.zoom > size.height - 72

  if (!compact && !verticalOverflow && !horizontalOverflow) return null

  return {
    ...viewport,
    x: horizontalOverflow ? 16 - bounds.x * viewport.zoom : viewport.x,
    y: compact || verticalOverflow ? 36 - bounds.y * viewport.zoom : viewport.y,
  }
}
