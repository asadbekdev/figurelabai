import {
  MarkerType,
  type Edge,
  type Node,
  type Viewport,
} from "@xyflow/react"

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

export function documentToReactFlow(document: FlowchartDocument): {
  nodes: FlowchartReactNode[]
  edges: FlowchartReactEdge[]
} {
  return {
    nodes: document.nodes.map((node) => ({
      id: node.id,
      type: "flowchart",
      position: node.position,
      data: { node },
      draggable: !node.locked,
      deletable: !node.locked,
      ariaLabel: `${node.type} node: ${node.text}`,
      style: {
        width: node.size.width,
        height: node.size.height,
      },
    })),
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

  return parseFlowchartDocument({
    ...baseDocument,
    viewport,
    nodes: nodes.map((reactNode) => {
      const source = reactNode.data.node ?? nodeById.get(reactNode.id)
      if (!source) {
        throw new Error(`Missing canonical node data for ${reactNode.id}`)
      }

      return {
        ...source,
        position: {
          x: reactNode.position.x,
          y: reactNode.position.y,
        },
      }
    }),
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
