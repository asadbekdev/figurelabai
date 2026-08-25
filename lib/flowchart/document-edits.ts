import type { FlowchartDocument, FlowchartNode } from "./schema"

function nextId(prefix: string, ids: Iterable<string>): string {
  const used = new Set(ids)
  let index = 1
  while (used.has(`${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

function hexToRgb(value: string): { r: number; g: number; b: number } | null {
  const hex = value.trim()
  const short = /^#([0-9a-f]{3})$/i.exec(hex)
  if (short?.[1]) {
    const [r, g, b] = short[1].split("").map((part) => Number.parseInt(part + part, 16))
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 }
  }
  const full = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(hex)
  if (!full?.[1]) return null
  return {
    r: Number.parseInt(full[1].slice(0, 2), 16),
    g: Number.parseInt(full[1].slice(2, 4), 16),
    b: Number.parseInt(full[1].slice(4, 6), 16),
  }
}

function toGray(color: string): string {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  const value = Math.round(0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b)
  const hex = value.toString(16).padStart(2, "0")
  return `#${hex}${hex}${hex}`
}

export function omitParentId(node: FlowchartNode): FlowchartNode {
  if (!node.parentId) return node
  const next = { ...node }
  delete next.parentId
  return next
}

export function nodeDepth(
  node: FlowchartNode,
  byId: Map<string, FlowchartNode>
): number {
  let depth = 0
  const walked = new Set<string>()
  let current = node.parentId
  while (current && !walked.has(current)) {
    walked.add(current)
    depth += 1
    current = byId.get(current)?.parentId
  }
  return depth
}

export function ancestorIds(
  node: FlowchartNode,
  byId: Map<string, FlowchartNode>
): string[] {
  const ids: string[] = []
  const walked = new Set<string>()
  let current = node.parentId
  while (current && !walked.has(current)) {
    walked.add(current)
    ids.push(current)
    current = byId.get(current)?.parentId
  }
  return ids
}

export function descendantIds(
  rootId: string,
  nodes: FlowchartNode[]
): string[] {
  const children = nodes.filter((node) => node.parentId === rootId)
  return children.flatMap((child) => [child.id, ...descendantIds(child.id, nodes)])
}

export function nodesInTreeOrder(nodes: FlowchartNode[]): FlowchartNode[] {
  const byParent = new Map<string | undefined, FlowchartNode[]>()
  for (const node of nodes) {
    const key = node.parentId
    const bucket = byParent.get(key) ?? []
    bucket.push(node)
    byParent.set(key, bucket)
  }
  const visit = (parentId: string | undefined): FlowchartNode[] => {
    const children = byParent.get(parentId) ?? []
    return children.flatMap((child) => [child, ...visit(child.id)])
  }
  return visit(undefined)
}

export function groupableSelectedNodes(
  document: FlowchartDocument,
  selectedIds: string[]
): FlowchartNode[] {
  const byId = new Map(document.nodes.map((node) => [node.id, node]))
  const selected = new Set(selectedIds)
  return document.nodes.filter((node) => {
    if (!selected.has(node.id) || node.locked) return false
    return !ancestorIds(node, byId).some((id) => selected.has(id))
  })
}

export function canGroupSelectedNodes(
  document: FlowchartDocument,
  selectedIds: string[]
): boolean {
  const members = groupableSelectedNodes(document, selectedIds)
  if (members.length < 2) return false
  const parents = new Set(members.map((node) => node.parentId ?? ""))
  return parents.size === 1
}

export function promoteReleasedNode(
  node: FlowchartNode,
  removedIds: Set<string>,
  originalById: Map<string, FlowchartNode>
): FlowchartNode {
  if (!node.parentId || !removedIds.has(node.parentId)) return node
  let current = originalById.get(node.parentId)
  while (current && removedIds.has(current.id)) {
    current = current.parentId ? originalById.get(current.parentId) : undefined
  }
  if (!current) return omitParentId(node)
  return { ...node, parentId: current.id }
}

export function groupSelectedNodes(
  document: FlowchartDocument,
  selectedIds: string[]
): FlowchartDocument | null {
  const members = groupableSelectedNodes(document, selectedIds)
  if (members.length < 2) return null
  const parents = new Set(members.map((node) => node.parentId ?? ""))
  if (parents.size !== 1) return null

  const sharedParent = members[0]?.parentId
  const minX = Math.min(...members.map((node) => node.position.x))
  const minY = Math.min(...members.map((node) => node.position.y))
  const maxX = Math.max(...members.map((node) => node.position.x + node.size.width))
  const maxY = Math.max(...members.map((node) => node.position.y + node.size.height))
  const padding = 20
  const groupId = nextId("group", document.nodes.map((node) => node.id))
  const group: FlowchartNode = {
    id: groupId,
    type: "group",
    position: { x: minX - padding, y: minY - padding },
    size: {
      width: Math.min(2_000, Math.max(96, maxX - minX + padding * 2)),
      height: Math.min(2_000, Math.max(64, maxY - minY + padding * 2)),
    },
    text: sharedParent ? "Nested group" : "Group",
    style: {
      fill: "#fafafa",
      stroke: "#a1a1aa",
      textColor: "#52525b",
      fontSize: 12,
      radius: 16,
      strokeWidth: 1.5,
    },
    ...(sharedParent ? { parentId: sharedParent } : {}),
  }

  const memberIds = new Set(members.map((node) => node.id))
  return {
    ...document,
    nodes: [
      group,
      ...document.nodes.map((node) =>
        memberIds.has(node.id) ? { ...node, parentId: groupId } : node
      ),
    ],
  }
}

export function ungroupSelectedNodes(
  document: FlowchartDocument,
  selectedIds: string[]
): FlowchartDocument | null {
  const selected = new Set(selectedIds)
  const groupIds = new Set<string>()

  for (const node of document.nodes) {
    if (node.type === "group" && selected.has(node.id)) {
      groupIds.add(node.id)
    }
    if (selected.has(node.id) && node.parentId) {
      const parent = document.nodes.find((item) => item.id === node.parentId)
      if (parent?.type === "group") groupIds.add(parent.id)
    }
  }

  if (groupIds.size === 0) return null
  const originalById = new Map(document.nodes.map((node) => [node.id, node]))

  return {
    ...document,
    nodes: document.nodes
      .filter((node) => !groupIds.has(node.id))
      .map((node) => promoteReleasedNode(node, groupIds, originalById)),
  }
}

export function applyDocumentColorMode(
  document: FlowchartDocument,
  mode: "color" | "grayscale"
): FlowchartDocument {
  return {
    ...document,
    page: { ...document.page, colorMode: mode },
  }
}

export function grayDocumentColor(color: string, mode?: "color" | "grayscale"): string {
  return mode === "grayscale" ? toGray(color) : color
}

export function scaleDocumentFonts(
  document: FlowchartDocument,
  delta: number
): FlowchartDocument {
  return {
    ...document,
    nodes: document.nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        fontSize: Math.min(96, Math.max(8, node.style.fontSize + delta)),
      },
    })),
  }
}
