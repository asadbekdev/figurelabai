import type { FlowchartDocument, FlowchartNode } from "@/lib/flowchart/schema"

import type { FigureDirection } from "./contracts"

const COLUMN_GAP = 240
const ROW_GAP = 168
const START_X = 80
const START_Y = 80

export function layoutFlowchartDocument(
  document: FlowchartDocument,
  direction: FigureDirection = "left-right"
): FlowchartDocument {
  if (document.nodes.length === 0) return document

  const incoming = new Map<string, number>()
  const outgoing = new Map<string, string[]>()

  for (const node of document.nodes) {
    incoming.set(node.id, 0)
    outgoing.set(node.id, [])
  }

  for (const edge of document.edges) {
    if (!incoming.has(edge.targetNodeId) || !outgoing.has(edge.sourceNodeId)) continue
    incoming.set(edge.targetNodeId, (incoming.get(edge.targetNodeId) ?? 0) + 1)
    outgoing.get(edge.sourceNodeId)?.push(edge.targetNodeId)
  }

  const layers: string[][] = []
  const placed = new Set<string>()
  let frontier = document.nodes
    .filter((node) => (incoming.get(node.id) ?? 0) === 0)
    .map((node) => node.id)

  if (frontier.length === 0) {
    frontier = [document.nodes[0].id]
  }

  while (frontier.length > 0) {
    layers.push(frontier)
    frontier.forEach((id) => placed.add(id))
    const next = new Set<string>()
    for (const id of layers.at(-1) ?? []) {
      for (const target of outgoing.get(id) ?? []) {
        if (!placed.has(target)) next.add(target)
      }
    }
    frontier = [...next]
  }

  for (const node of document.nodes) {
    if (!placed.has(node.id)) {
      layers.push([node.id])
    }
  }

  const nodeById = new Map(document.nodes.map((node) => [node.id, node]))
  const positioned: FlowchartNode[] = []

  layers.forEach((layer, layerIndex) => {
    layer.forEach((id, index) => {
      const node = nodeById.get(id)
      if (!node) return
      const x =
        direction === "top-bottom"
          ? START_X + index * COLUMN_GAP
          : START_X + layerIndex * COLUMN_GAP
      const y =
        direction === "top-bottom"
          ? START_Y + layerIndex * ROW_GAP
          : START_Y + index * ROW_GAP
      positioned.push({
        ...node,
        position: { x, y },
      })
    })
  })

  const maxRight = Math.max(
    ...positioned.map((node) => node.position.x + node.size.width),
    640
  )
  const maxBottom = Math.max(
    ...positioned.map((node) => node.position.y + node.size.height),
    400
  )

  return {
    ...document,
    nodes: positioned,
    page: {
      ...document.page,
      width: Math.min(20_000, Math.max(document.page.width, maxRight + document.page.padding)),
      height: Math.min(20_000, Math.max(document.page.height, maxBottom + document.page.padding)),
    },
  }
}

export function positionsNeedRelayout(nodes: FlowchartNode[]): boolean {
  if (nodes.length <= 1) return false
  const seen = new Set<string>()
  for (const node of nodes) {
    const key = `${Math.round(node.position.x)}:${Math.round(node.position.y)}`
    if (seen.has(key)) return true
    seen.add(key)
    if (!Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) return true
  }
  return false
}
