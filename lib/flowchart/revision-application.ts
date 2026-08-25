import { checksumDocument } from "@/lib/product/workspace-checksum"

import {
  parseFlowchartDocument,
  type FlowchartDocument,
  type FlowchartEdge,
  type FlowchartNode,
} from "./schema"

export type FlowchartRevisionPatchChange = {
  id: string
  kind: "node" | "connection" | "document"
  action: "add" | "edit" | "remove"
  title: string
  description: string
}

function nodeChangeDescription(before: FlowchartNode, after: FlowchartNode): string {
  const changes: string[] = []
  if (before.text !== after.text) changes.push("label")
  if (before.type !== after.type) changes.push("shape")
  if (
    before.position.x !== after.position.x ||
    before.position.y !== after.position.y ||
    before.size.width !== after.size.width ||
    before.size.height !== after.size.height ||
    before.parentId !== after.parentId
  ) {
    changes.push("layout")
  }
  if (JSON.stringify(before.style) !== JSON.stringify(after.style)) changes.push("appearance")
  if (Boolean(before.locked) !== Boolean(after.locked)) changes.push("lock state")
  if (JSON.stringify(before.data) !== JSON.stringify(after.data)) changes.push("properties")
  return changes.length > 0 ? `Updates ${changes.join(", ")}` : "Updates node"
}

function edgeTitle(edge: FlowchartEdge, document: FlowchartDocument): string {
  const source = document.nodes.find((node) => node.id === edge.sourceNodeId)?.text
  const target = document.nodes.find((node) => node.id === edge.targetNodeId)?.text
  return `${source ?? "Node"} → ${target ?? "Node"}`
}

function edgeChangeDescription(before: FlowchartEdge, after: FlowchartEdge): string {
  const changes: string[] = []
  if (
    before.sourceNodeId !== after.sourceNodeId ||
    before.targetNodeId !== after.targetNodeId ||
    before.sourceHandle !== after.sourceHandle ||
    before.targetHandle !== after.targetHandle
  ) {
    changes.push("endpoints")
  }
  if (before.label !== after.label) changes.push("label")
  if (before.type !== after.type) changes.push("route")
  if (JSON.stringify(before.style) !== JSON.stringify(after.style)) changes.push("appearance")
  return changes.length > 0 ? `Updates ${changes.join(", ")}` : "Updates connection"
}

export function summarizeFlowchartRevisionPatch(
  currentInput: FlowchartDocument,
  resultInput: FlowchartDocument
): FlowchartRevisionPatchChange[] {
  const current = parseFlowchartDocument(currentInput)
  const result = parseFlowchartDocument(resultInput)
  const currentNodes = new Map(current.nodes.map((node) => [node.id, node]))
  const resultNodes = new Map(result.nodes.map((node) => [node.id, node]))
  const currentEdges = new Map(current.edges.map((edge) => [edge.id, edge]))
  const resultEdges = new Map(result.edges.map((edge) => [edge.id, edge]))
  const changes: FlowchartRevisionPatchChange[] = []

  for (const node of result.nodes) {
    const before = currentNodes.get(node.id)
    if (!before) {
      changes.push({
        id: `node:add:${node.id}`,
        kind: "node",
        action: "add",
        title: node.text,
        description: `Adds ${node.type} node`,
      })
    } else if (JSON.stringify(before) !== JSON.stringify(node)) {
      changes.push({
        id: `node:edit:${node.id}`,
        kind: "node",
        action: "edit",
        title: node.text,
        description: nodeChangeDescription(before, node),
      })
    }
  }

  for (const node of current.nodes) {
    if (resultNodes.has(node.id)) continue
    changes.push({
      id: `node:remove:${node.id}`,
      kind: "node",
      action: "remove",
      title: node.text,
      description: `Removes ${node.type} node`,
    })
  }

  for (const edge of result.edges) {
    const before = currentEdges.get(edge.id)
    if (!before) {
      changes.push({
        id: `connection:add:${edge.id}`,
        kind: "connection",
        action: "add",
        title: edgeTitle(edge, result),
        description: "Adds connection",
      })
    } else if (JSON.stringify(before) !== JSON.stringify(edge)) {
      changes.push({
        id: `connection:edit:${edge.id}`,
        kind: "connection",
        action: "edit",
        title: edgeTitle(edge, result),
        description: edgeChangeDescription(before, edge),
      })
    }
  }

  for (const edge of current.edges) {
    if (resultEdges.has(edge.id)) continue
    changes.push({
      id: `connection:remove:${edge.id}`,
      kind: "connection",
      action: "remove",
      title: edgeTitle(edge, current),
      description: "Removes connection",
    })
  }

  const documentChanges: FlowchartRevisionPatchChange[] = []
  if (current.metadata.title !== result.metadata.title) {
    documentChanges.push({
      id: "document:edit:title",
      kind: "document",
      action: "edit",
      title: result.metadata.title,
      description: "Updates figure title",
    })
  }

  if (current.metadata.description !== result.metadata.description) {
    documentChanges.push({
      id: "document:edit:description",
      kind: "document",
      action: "edit",
      title: "Figure description",
      description: "Updates figure description",
    })
  }

  if (
    JSON.stringify(current.metadata.sourceAssetIds) !==
    JSON.stringify(result.metadata.sourceAssetIds)
  ) {
    documentChanges.push({
      id: "document:edit:sources",
      kind: "document",
      action: "edit",
      title: "Figure sources",
      description: "Updates linked source assets",
    })
  }

  if (JSON.stringify(current.page) !== JSON.stringify(result.page)) {
    const pageChanges: string[] = []
    if (current.page.width !== result.page.width || current.page.height !== result.page.height) {
      pageChanges.push("dimensions")
    }
    if (current.page.background !== result.page.background) pageChanges.push("background")
    if (current.page.padding !== result.page.padding) pageChanges.push("padding")
    if (current.page.colorMode !== result.page.colorMode) pageChanges.push("color mode")
    documentChanges.push({
      id: "document:edit:page",
      kind: "document",
      action: "edit",
      title: "Figure page",
      description: `Updates ${pageChanges.join(", ") || "page settings"}`,
    })
  }

  const currentNodeOrder = current.nodes
    .map((node) => node.id)
    .filter((id) => resultNodes.has(id))
  const resultNodeOrder = result.nodes
    .map((node) => node.id)
    .filter((id) => currentNodes.has(id))
  if (JSON.stringify(currentNodeOrder) !== JSON.stringify(resultNodeOrder)) {
    documentChanges.push({
      id: "document:edit:node-order",
      kind: "document",
      action: "edit",
      title: "Node reading order",
      description: "Updates the object-list and keyboard reading order",
    })
  }

  const currentEdgeOrder = current.edges
    .map((edge) => edge.id)
    .filter((id) => resultEdges.has(id))
  const resultEdgeOrder = result.edges
    .map((edge) => edge.id)
    .filter((id) => currentEdges.has(id))
  if (JSON.stringify(currentEdgeOrder) !== JSON.stringify(resultEdgeOrder)) {
    documentChanges.push({
      id: "document:edit:connection-order",
      kind: "document",
      action: "edit",
      title: "Connection reading order",
      description: "Updates the connection-list and keyboard reading order",
    })
  }

  return [...documentChanges, ...changes]
}

export type FlowchartRevisionCompletion =
  | {
      status: "apply"
      document: FlowchartDocument
    }
  | {
      status: "conflict"
      currentDocument: FlowchartDocument
      resultDocument: FlowchartDocument
      reason: "revision_changed" | "document_changed"
    }

/**
 * Fingerprint the editable figure content while ignoring the transient viewport.
 * Panning or zooming while a revision runs must not block an otherwise safe result.
 */
export function fingerprintFlowchartRevisionBase(document: FlowchartDocument): string {
  const parsed = parseFlowchartDocument(document)
  return checksumDocument({
    ...parsed,
    viewport: { x: 0, y: 0, zoom: 1 },
  })
}

export function resolveFlowchartRevisionCompletion(input: {
  baseRevision: number | null
  baseDocumentChecksum: string
  currentRevision: number
  currentDocument: FlowchartDocument
  resultDocument: unknown
}): FlowchartRevisionCompletion {
  const currentDocument = parseFlowchartDocument(input.currentDocument)
  const resultDocument = parseFlowchartDocument(input.resultDocument)
  const currentChecksum = fingerprintFlowchartRevisionBase(currentDocument)

  if (currentChecksum !== input.baseDocumentChecksum) {
    return {
      status: "conflict",
      currentDocument,
      resultDocument,
      reason:
        input.baseRevision !== null && input.currentRevision !== input.baseRevision
          ? "revision_changed"
          : "document_changed",
    }
  }

  return {
    status: "apply",
    document: {
      ...resultDocument,
      // The viewport belongs to the researcher, not the generated patch.
      // Accepting a content revision must not unexpectedly pan or zoom them.
      viewport: currentDocument.viewport,
    },
  }
}
