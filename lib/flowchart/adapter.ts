import {
  MarkerType,
  type Edge,
  type Node,
  type Viewport,
} from "@xyflow/react"

import { nodeDepth } from "./document-edits"
import {
  parseFlowchartDocument,
  type FlowchartDocument,
  type FlowchartEdge,
  type FlowchartNode,
} from "./schema"

export type FlowchartNodeData = {
  node: FlowchartNode
}

export type FlowchartEdgeData = {
  edge: FlowchartEdge
}

export type FlowchartReactNode = Node<FlowchartNodeData, "flowchart">
export type FlowchartReactEdge = Edge<FlowchartEdgeData>

function parentsBeforeChildren(nodes: FlowchartNode[]): FlowchartNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const ordered: FlowchartNode[] = []
  const seen = new Set<string>()

  const visit = (node: FlowchartNode) => {
    if (seen.has(node.id)) return
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) visit(parent)
    if (seen.has(node.id)) return
    seen.add(node.id)
    ordered.push(node)
  }

  for (const node of nodes) visit(node)
  return ordered
}

function absoluteReactPosition(
  reactNode: FlowchartReactNode,
  nodes: FlowchartReactNode[]
): { x: number; y: number } {
  let x = reactNode.position.x
  let y = reactNode.position.y
  let parentId = reactNode.parentId
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const walked = new Set<string>()

  while (parentId && !walked.has(parentId)) {
    walked.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    parentId = parent.parentId
  }

  return { x, y }
}

function toCanonicalNode(
  reactNode: FlowchartReactNode,
  source: FlowchartNode,
  nodes: FlowchartReactNode[]
): FlowchartNode {
  const parentId = source.parentId || reactNode.parentId || undefined
  const position = reactNode.parentId
    ? absoluteReactPosition(reactNode, nodes)
    : { x: reactNode.position.x, y: reactNode.position.y }

  if (parentId) {
    return { ...source, parentId, position }
  }

  return { ...source, position }
}

function clipInsetForAncestors(
  node: FlowchartNode,
  byId: Map<string, FlowchartNode>
): string | undefined {
  let left = Number.NEGATIVE_INFINITY
  let top = Number.NEGATIVE_INFINITY
  let right = Number.POSITIVE_INFINITY
  let bottom = Number.POSITIVE_INFINITY
  const walked = new Set<string>()
  let parentId = node.parentId
  while (parentId && !walked.has(parentId)) {
    walked.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    left = Math.max(left, parent.position.x)
    top = Math.max(top, parent.position.y)
    right = Math.min(right, parent.position.x + parent.size.width)
    bottom = Math.min(bottom, parent.position.y + parent.size.height)
    parentId = parent.parentId
  }
  if (!Number.isFinite(left)) return undefined
  if (right <= left || bottom <= top) return "inset(100%)"
  const insetLeft = Math.max(0, left - node.position.x)
  const insetTop = Math.max(0, top - node.position.y)
  const insetRight = Math.max(0, node.position.x + node.size.width - right)
  const insetBottom = Math.max(0, node.position.y + node.size.height - bottom)
  if (insetLeft + insetRight >= node.size.width || insetTop + insetBottom >= node.size.height) {
    return "inset(100%)"
  }
  if (insetLeft === 0 && insetTop === 0 && insetRight === 0 && insetBottom === 0) {
    return undefined
  }
  return `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`
}

export function documentToReactFlow(document: FlowchartDocument): {
  nodes: FlowchartReactNode[]
  edges: FlowchartReactEdge[]
} {
  const byId = new Map(document.nodes.map((node) => [node.id, node]))
  return {
    nodes: parentsBeforeChildren(document.nodes).map((node) => {
      const depth = nodeDepth(node, byId)
      const clipPath = clipInsetForAncestors(node, byId)
      return {
        id: node.id,
        type: "flowchart",
        position: node.position,
        // Groups keep parentId on the document only. React Flow parentId
        // remounts child refs in a layout-effect loop.
        zIndex: depth * 2 + (node.type === "group" ? 0 : 1),
        data: { node },
        draggable: !node.locked,
        deletable: !node.locked,
        ariaLabel: `${node.type} node: ${node.text}`,
        style: {
          width: node.size.width,
          height: node.size.height,
          zIndex: depth * 2 + (node.type === "group" ? 0 : 1),
          ...(clipPath ? { clipPath } : {}),
        },
      }
    }),
    edges: document.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      label: edge.label,
      data: { edge },
      deletable: true,
      reconnectable: true,
      markerEnd:
        edge.style.markerEnd === "arrow"
          ? { type: MarkerType.ArrowClosed, color: edge.style.color }
          : undefined,
      style: {
        stroke: edge.style.color,
        strokeWidth: edge.style.width,
        strokeDasharray: edge.style.dashed ? "6 5" : undefined,
      },
    })),
  }
}

export function reactFlowToDocument(
  baseDocument: FlowchartDocument,
  nodes: FlowchartReactNode[],
  edges: FlowchartReactEdge[],
  viewport: Viewport = baseDocument.viewport
): FlowchartDocument {
  const nodeById = new Map(baseDocument.nodes.map((node) => [node.id, node]))
  const edgeById = new Map(baseDocument.edges.map((edge) => [edge.id, edge]))

  const rfById = new Map(nodes.map((node) => [node.id, node]))
  const kept = baseDocument.nodes.flatMap((source) => {
    const reactNode = rfById.get(source.id)
    if (!reactNode) return []
    return [toCanonicalNode(reactNode, source, nodes)]
  })
  const extras = nodes.flatMap((reactNode) => {
    if (nodeById.has(reactNode.id)) return []
    const source = reactNode.data.node
    if (!source) {
      throw new Error(`Missing canonical node data for ${reactNode.id}`)
    }
    return [toCanonicalNode(reactNode, source, nodes)]
  })

  return parseFlowchartDocument({
    ...baseDocument,
    viewport,
    nodes: [...kept, ...extras],
    edges: edges.map((reactEdge) => {
      const source = reactEdge.data?.edge ?? edgeById.get(reactEdge.id)
      if (!source) {
        throw new Error(`Missing canonical edge data for ${reactEdge.id}`)
      }

      return {
        ...source,
        sourceNodeId: reactEdge.source,
        targetNodeId: reactEdge.target,
        sourceHandle: reactEdge.sourceHandle ?? undefined,
        targetHandle: reactEdge.targetHandle ?? undefined,
      }
    }),
  })
}
