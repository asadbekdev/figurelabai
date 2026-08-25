"use client"

import { create } from "zustand"

import { layoutFlowchartDocument } from "@/lib/generation/layout"
import type { FigureDirection } from "@/lib/generation/contracts"
import {
  applyDocumentColorMode,
  groupSelectedNodes,
  omitParentId,
  promoteReleasedNode,
  scaleDocumentFonts,
  ungroupSelectedNodes,
} from "./document-edits"

import { demoFlowchartDocument } from "./fixture"
import {
  cloneFlowchartDocument,
  parseFlowchartDocument,
  type FlowchartDocument,
  type FlowchartEdge,
  type FlowchartNode,
} from "./schema"

export const FLOWCHART_CLIPBOARD_KIND = "figurelab-flowchart"

export type FlowchartClipboard = {
  kind: typeof FLOWCHART_CLIPBOARD_KIND
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
}

const HISTORY_LIMIT = 60

type DocumentUpdater = (document: FlowchartDocument) => FlowchartDocument

type FlowchartEditorState = {
  document: FlowchartDocument
  past: FlowchartDocument[]
  future: FlowchartDocument[]
  selectedNodeIds: string[]
  selectedEdgeId: string | null
  announcement: string
  changeSerial: number
  commit: (updater: DocumentUpdater, announcement: string) => void
  replaceDocument: (document: FlowchartDocument, announcement: string) => void
  loadDocument: (document: FlowchartDocument, options?: { dirty?: boolean }) => void
  selectNodes: (ids: string[]) => void
  selectEdge: (id: string | null) => void
  updateNode: (id: string, patch: Partial<FlowchartNode>) => void
  updateEdge: (id: string, patch: Partial<FlowchartEdge>) => void
  updateViewport: (viewport: FlowchartDocument["viewport"]) => void
  addNode: (position?: { x: number; y: number }) => string
  addEdge: (sourceNodeId: string, targetNodeId: string) => void
  duplicateSelection: () => void
  copySelection: () => FlowchartClipboard | null
  pasteClipboard: (payload: FlowchartClipboard) => void
  applyAutoLayout: (direction?: FigureDirection) => void
  groupSelection: () => void
  ungroupSelection: () => void
  applyColorMode: (mode: "color" | "grayscale") => void
  scaleFonts: (delta: number) => void
  deleteSelection: () => void
  undo: () => void
  redo: () => void
}

function nextId(prefix: string, ids: Iterable<string>): string {
  const used = new Set(ids)
  let index = 1
  while (used.has(`${prefix}-${index}`)) index += 1
  return `${prefix}-${index}`
}

function remapParentIds(
  nodes: FlowchartNode[],
  idMap: Map<string, string>
): FlowchartNode[] {
  return nodes.map((node) => {
    const mappedParent = node.parentId ? idMap.get(node.parentId) : undefined
    if (mappedParent) return { ...node, parentId: mappedParent }
    return omitParentId(node)
  })
}

function commitDocument(
  state: FlowchartEditorState,
  nextDocument: FlowchartDocument,
  announcement: string
): Partial<FlowchartEditorState> {
  return {
    document: parseFlowchartDocument(nextDocument),
    past: [...state.past, cloneFlowchartDocument(state.document)].slice(-HISTORY_LIMIT),
    future: [],
    announcement,
    changeSerial: state.changeSerial + 1,
  }
}

export const useFlowchartEditorStore = create<FlowchartEditorState>((set, get) => ({
  document: cloneFlowchartDocument(demoFlowchartDocument),
  past: [],
  future: [],
  selectedNodeIds: [],
  selectedEdgeId: null,
  announcement: "Deterministic flowchart loaded",
  changeSerial: 0,

  commit: (updater, announcement) => {
    const state = get()
    set(commitDocument(state, updater(cloneFlowchartDocument(state.document)), announcement))
  },

  replaceDocument: (document, announcement) => {
    const state = get()
    set(commitDocument(state, document, announcement))
  },

  loadDocument: (document, options) => {
    set({
      document: parseFlowchartDocument(document),
      past: [],
      future: [],
      selectedNodeIds: [],
      selectedEdgeId: null,
      announcement: options?.dirty ? "Recovered unsaved edits" : "Project loaded",
      changeSerial: options?.dirty ? 1 : 0,
    })
  },

  selectNodes: (ids) => {
    const state = get()
    const selectionUnchanged =
      state.selectedEdgeId === null &&
      state.selectedNodeIds.length === ids.length &&
      state.selectedNodeIds.every((id) => ids.includes(id))
    if (selectionUnchanged) return

    set({
      selectedNodeIds: ids,
      selectedEdgeId: null,
      announcement: ids.length === 1 ? "Node selected" : `${ids.length} nodes selected`,
    })
  },

  selectEdge: (id) => {
    const state = get()
    if (state.selectedNodeIds.length === 0 && state.selectedEdgeId === id) return

    set({
      selectedNodeIds: [],
      selectedEdgeId: id,
      announcement: id ? "Connection selected" : "Selection cleared",
    })
  },

  updateNode: (id, patch) => {
    get().commit(
      (document) => ({
        ...document,
        nodes: document.nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                ...patch,
                position: patch.position ? { ...node.position, ...patch.position } : node.position,
                size: patch.size ? { ...node.size, ...patch.size } : node.size,
                style: patch.style ? { ...node.style, ...patch.style } : node.style,
              }
            : node
        ),
      }),
      "Node updated"
    )
  },

  updateEdge: (id, patch) => {
    get().commit(
      (document) => ({
        ...document,
        edges: document.edges.map((edge) =>
          edge.id === id
            ? {
                ...edge,
                ...patch,
                style: patch.style ? { ...edge.style, ...patch.style } : edge.style,
              }
            : edge
        ),
      }),
      "Connection updated"
    )
  },

  updateViewport: (viewport) => {
    const state = get()
    if (
      state.document.viewport.x === viewport.x &&
      state.document.viewport.y === viewport.y &&
      state.document.viewport.zoom === viewport.zoom
    ) {
      return
    }
    // Preserve node and edge array identity: a viewport move must not force
    // canvas consumers to rebuild or re-measure the document structure.
    set({
      document: { ...state.document, viewport },
      announcement: "Viewport updated",
    })
  },

  addNode: (position) => {
    const state = get()
    const id = nextId("node", state.document.nodes.map((node) => node.id))
    const anchor = state.document.nodes.find((node) => node.id === state.selectedNodeIds[0])
    const node: FlowchartNode = {
      id,
      type: "process",
      position: position ?? {
        x: (anchor?.position.x ?? 120) + 240,
        y: anchor?.position.y ?? 160,
      },
      size: { width: 180, height: 84 },
      text: "New process",
      style: {
        fill: "#ffffff",
        stroke: "#3f3f46",
        textColor: "#18181b",
        fontSize: 14,
        radius: 14,
        strokeWidth: 2,
      },
    }
    const edge: FlowchartEdge | null = anchor
      ? {
          id: nextId("edge", state.document.edges.map((item) => item.id)),
          sourceNodeId: anchor.id,
          targetNodeId: id,
          type: "smoothstep",
          style: { color: "#52525b", width: 2, markerEnd: "arrow", dashed: false },
        }
      : null

    set(
      commitDocument(
        state,
        {
          ...state.document,
          nodes: [...state.document.nodes, node],
          edges: edge ? [...state.document.edges, edge] : state.document.edges,
        },
        anchor ? "Connected process added" : "Process added"
      )
    )
    set({ selectedNodeIds: [id], selectedEdgeId: null })
    return id
  },

  addEdge: (sourceNodeId, targetNodeId) => {
    const state = get()
    if (
      sourceNodeId === targetNodeId ||
      state.document.edges.some(
        (edge) => edge.sourceNodeId === sourceNodeId && edge.targetNodeId === targetNodeId
      )
    ) {
      set({ announcement: "Connection already exists or is invalid" })
      return
    }
    const edge: FlowchartEdge = {
      id: nextId("edge", state.document.edges.map((item) => item.id)),
      sourceNodeId,
      targetNodeId,
      type: "smoothstep",
      style: { color: "#52525b", width: 2, markerEnd: "arrow", dashed: false },
    }
    set(
      commitDocument(
        state,
        { ...state.document, edges: [...state.document.edges, edge] },
        "Connection added"
      )
    )
    set({ selectedNodeIds: [], selectedEdgeId: edge.id })
  },

  duplicateSelection: () => {
    const state = get()
    if (state.selectedNodeIds.length === 0) return
    const reservedIds = state.document.nodes.map((node) => node.id)
    const idMap = new Map<string, string>()
    const copies = state.document.nodes
      .filter((node) => state.selectedNodeIds.includes(node.id))
      .map((node) => {
        const id = nextId("node", reservedIds)
        reservedIds.push(id)
        idMap.set(node.id, id)
        return {
          ...node,
          id,
          position: { x: node.position.x + 32, y: node.position.y + 32 },
          text: `${node.text} copy`,
        }
      })
    const remapped = remapParentIds(copies, idMap)
    set(
      commitDocument(
        state,
        { ...state.document, nodes: [...state.document.nodes, ...remapped] },
        remapped.length === 1 ? "Node duplicated" : `${remapped.length} nodes duplicated`
      )
    )
    set({ selectedNodeIds: remapped.map((node) => node.id), selectedEdgeId: null })
  },

  copySelection: () => {
    const state = get()
    if (state.selectedNodeIds.length === 0) return null
    const selected = new Set(state.selectedNodeIds)
    return {
      kind: FLOWCHART_CLIPBOARD_KIND,
      nodes: state.document.nodes.filter((node) => selected.has(node.id)),
      edges: state.document.edges.filter(
        (edge) => selected.has(edge.sourceNodeId) && selected.has(edge.targetNodeId)
      ),
    }
  },

  pasteClipboard: (payload) => {
    if (payload.kind !== FLOWCHART_CLIPBOARD_KIND || payload.nodes.length === 0) return
    const state = get()
    const reservedIds = state.document.nodes.map((node) => node.id)
    const idMap = new Map<string, string>()
    const copies = payload.nodes.map((node) => {
      const id = nextId("node", reservedIds)
      reservedIds.push(id)
      idMap.set(node.id, id)
      return {
        ...node,
        id,
        position: { x: node.position.x + 32, y: node.position.y + 32 },
      }
    })
    const remappedNodes = remapParentIds(copies, idMap)
    const reservedEdgeIds = state.document.edges.map((item) => item.id)
    const edges = payload.edges.flatMap((edge) => {
      const sourceNodeId = idMap.get(edge.sourceNodeId)
      const targetNodeId = idMap.get(edge.targetNodeId)
      if (!sourceNodeId || !targetNodeId) return []
      const id = nextId("edge", reservedEdgeIds)
      reservedEdgeIds.push(id)
      return [
        {
          ...edge,
          id,
          sourceNodeId,
          targetNodeId,
        },
      ]
    })
    set(
      commitDocument(
        state,
        {
          ...state.document,
          nodes: [...state.document.nodes, ...remappedNodes],
          edges: [...state.document.edges, ...edges],
        },
        remappedNodes.length === 1 ? "Node pasted" : `${remappedNodes.length} nodes pasted`
      )
    )
    set({ selectedNodeIds: remappedNodes.map((node) => node.id), selectedEdgeId: null })
  },

  applyAutoLayout: (direction = "left-right") => {
    const state = get()
    const next = layoutFlowchartDocument(state.document, direction)
    set(commitDocument(state, next, `Auto-layout ${direction.replace("-", " ")}`))
  },

  groupSelection: () => {
    const state = get()
    const next = groupSelectedNodes(state.document, state.selectedNodeIds)
    if (!next) {
      set({ announcement: "Select at least two nodes to group" })
      return
    }
    const group = next.nodes.find(
      (node) => node.type === "group" && !state.document.nodes.some((item) => item.id === node.id)
    )
    set({
      ...commitDocument(state, next, "Nodes grouped"),
      selectedNodeIds: group ? [group.id] : state.selectedNodeIds,
      selectedEdgeId: null,
    })
  },

  ungroupSelection: () => {
    const state = get()
    const next = ungroupSelectedNodes(state.document, state.selectedNodeIds)
    if (!next) {
      set({ announcement: "Select a group to ungroup" })
      return
    }
    const released = next.nodes
      .filter((node) => {
        const previous = state.document.nodes.find((item) => item.id === node.id)
        return Boolean(previous?.parentId && !node.parentId)
      })
      .map((node) => node.id)
    set({
      ...commitDocument(state, next, "Nodes ungrouped"),
      selectedNodeIds: released,
      selectedEdgeId: null,
    })
  },

  applyColorMode: (mode) => {
    const state = get()
    set(
      commitDocument(
        state,
        applyDocumentColorMode(state.document, mode),
        mode === "grayscale" ? "Converted to grayscale" : "Color mode"
      )
    )
  },

  scaleFonts: (delta) => {
    const state = get()
    set(
      commitDocument(
        state,
        scaleDocumentFonts(state.document, delta),
        delta > 0 ? "Fonts grown" : "Fonts shrunk"
      )
    )
  },

  deleteSelection: () => {
    const state = get()
    if (state.selectedNodeIds.length === 0 && !state.selectedEdgeId) return
    const selectedNodes = new Set(
      state.document.nodes
        .filter((node) => state.selectedNodeIds.includes(node.id) && !node.locked)
        .map((node) => node.id)
    )
    const lockedNodeIds = state.selectedNodeIds.filter(
      (id) => state.document.nodes.find((node) => node.id === id)?.locked
    )
    if (selectedNodes.size === 0 && !state.selectedEdgeId) {
      set({ announcement: "Locked nodes were preserved" })
      return
    }
    set(
      commitDocument(
        state,
        {
          ...state.document,
          nodes: state.document.nodes
            .filter((node) => !selectedNodes.has(node.id))
            .map((node) =>
              promoteReleasedNode(
                node,
                selectedNodes,
                new Map(state.document.nodes.map((item) => [item.id, item]))
              )
            ),
          edges: state.document.edges.filter(
            (edge) =>
              edge.id !== state.selectedEdgeId &&
              !selectedNodes.has(edge.sourceNodeId) &&
              !selectedNodes.has(edge.targetNodeId)
          ),
        },
        selectedNodes.size > 0
          ? lockedNodeIds.length > 0
            ? `Selection deleted; ${lockedNodeIds.length} locked ${
                lockedNodeIds.length === 1 ? "node was" : "nodes were"
              } preserved`
            : "Selection deleted"
          : "Connection deleted"
      )
    )
    set({ selectedNodeIds: lockedNodeIds, selectedEdgeId: null })
  },

  undo: () => {
    const state = get()
    const previous = state.past.at(-1)
    if (!previous) return
    set({
      document: parseFlowchartDocument(previous),
      past: state.past.slice(0, -1),
      future: [cloneFlowchartDocument(state.document), ...state.future].slice(0, HISTORY_LIMIT),
      selectedNodeIds: [],
      selectedEdgeId: null,
      announcement: "Change undone",
      changeSerial: state.changeSerial + 1,
    })
  },

  redo: () => {
    const state = get()
    const next = state.future[0]
    if (!next) return
    set({
      document: parseFlowchartDocument(next),
      past: [...state.past, cloneFlowchartDocument(state.document)].slice(-HISTORY_LIMIT),
      future: state.future.slice(1),
      selectedNodeIds: [],
      selectedEdgeId: null,
      announcement: "Change redone",
      changeSerial: state.changeSerial + 1,
    })
  },
}))
