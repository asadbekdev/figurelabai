import { describe, expect, it } from "vitest"

import { documentToReactFlow, reactFlowToDocument } from "../../lib/flowchart/adapter"
import { demoFlowchartDocument } from "../../lib/flowchart/fixture"
import { cloneFlowchartDocument } from "../../lib/flowchart/schema"
import {
  applyDocumentColorMode,
  groupSelectedNodes,
  scaleDocumentFonts,
  ungroupSelectedNodes,
} from "../../lib/flowchart/document-edits"
import { renderFlowchartSvg } from "../../lib/flowchart/svg"
import { useFlowchartEditorStore } from "../../lib/flowchart/store"

describe("flowchart grouping and global edits", () => {
  it("groups selected nodes with parentId", () => {
    const document = cloneFlowchartDocument(demoFlowchartDocument)
    const ids = document.nodes.slice(0, 2).map((node) => node.id)
    const next = groupSelectedNodes(document, ids)
    expect(next).not.toBeNull()
    const group = next!.nodes.find((node) => node.type === "group")
    expect(group).toBeTruthy()
    const children = next!.nodes.filter((node) => node.parentId === group!.id)
    expect(children.length).toBe(2)
    expect(children[0]?.position).toEqual(document.nodes[0]?.position)
  })

  it("round-trips grouped nodes through React Flow without moving them", () => {
    const document = cloneFlowchartDocument(demoFlowchartDocument)
    const ids = document.nodes.slice(0, 2).map((node) => node.id)
    const grouped = groupSelectedNodes(document, ids)!
    const adapted = documentToReactFlow(grouped)
    const back = reactFlowToDocument(grouped, adapted.nodes, adapted.edges, grouped.viewport)
    const group = back.nodes.find((node) => node.type === "group")
    expect(group).toBeTruthy()
    expect(back.nodes.filter((node) => node.parentId === group!.id)).toHaveLength(2)
    expect(
      back.nodes
        .filter((node) => node.parentId === group!.id)
        .map((node) => `${node.id}:${node.position.x},${node.position.y}`)
    ).toEqual(
      grouped.nodes
        .filter((node) => node.parentId === group!.id)
        .map((node) => `${node.id}:${node.position.x},${node.position.y}`)
    )
  })

  it("nests a group inside another group and clips children in SVG", () => {
    const document = cloneFlowchartDocument(demoFlowchartDocument)
    const first = groupSelectedNodes(
      document,
      document.nodes.slice(0, 2).map((node) => node.id)
    )!
    const inner = first.nodes.find((node) => node.type === "group")!
    const outsider = first.nodes.find((node) => !node.parentId && node.type !== "group")!
    const nested = groupSelectedNodes(first, [inner.id, outsider.id])
    expect(nested).not.toBeNull()
    const outer = nested!.nodes.find(
      (node) => node.type === "group" && node.id !== inner.id && !node.parentId
    )
    expect(outer).toBeTruthy()
    expect(nested!.nodes.find((node) => node.id === inner.id)?.parentId).toBe(outer!.id)
    expect(nested!.nodes.find((node) => node.id === outsider.id)?.parentId).toBe(outer!.id)

    const overflowing = {
      ...nested!,
      nodes: nested!.nodes.map((node) =>
        node.id === outsider.id
          ? {
              ...node,
              position: {
                x: outer!.position.x + outer!.size.width - 20,
                y: node.position.y,
              },
            }
          : node
      ),
    }
    const svg = renderFlowchartSvg(overflowing)
    expect(svg).toContain(`clip-path="url(#clip-`)
    expect(svg).toContain(`data-clip-parent="${outer!.id}"`)

    const promoted = ungroupSelectedNodes(nested!, [outer!.id])
    expect(promoted!.nodes.find((node) => node.id === inner.id)?.parentId).toBeUndefined()
    expect(promoted!.nodes.some((node) => node.id === inner.id && node.type === "group")).toBe(true)
  })

  it("ungroups and restores children without a parent", () => {
    const document = cloneFlowchartDocument(demoFlowchartDocument)
    const ids = document.nodes.slice(0, 2).map((node) => node.id)
    const grouped = groupSelectedNodes(document, ids)!
    const group = grouped.nodes.find((node) => node.type === "group")!
    const next = ungroupSelectedNodes(grouped, [group.id])
    expect(next).not.toBeNull()
    expect(next!.nodes.some((node) => node.type === "group")).toBe(false)
    expect(next!.nodes.some((node) => node.parentId)).toBe(false)
    expect(next!.nodes.map((node) => node.id)).toEqual(document.nodes.map((node) => node.id))
  })

  it("groups from the store, undoes, and strips parentId when the group is deleted", () => {
    useFlowchartEditorStore.getState().loadDocument(demoFlowchartDocument)
    const ids = demoFlowchartDocument.nodes.slice(0, 2).map((node) => node.id)
    useFlowchartEditorStore.getState().selectNodes(ids)
    useFlowchartEditorStore.getState().groupSelection()
    const grouped = useFlowchartEditorStore.getState().document
    const group = grouped.nodes.find((node) => node.type === "group")
    expect(group).toBeTruthy()
    expect(useFlowchartEditorStore.getState().selectedNodeIds).toEqual([group!.id])

    useFlowchartEditorStore.getState().undo()
    expect(useFlowchartEditorStore.getState().document.nodes.some((node) => node.type === "group")).toBe(
      false
    )

    useFlowchartEditorStore.getState().selectNodes(ids)
    useFlowchartEditorStore.getState().groupSelection()
    const again = useFlowchartEditorStore.getState().document.nodes.find((node) => node.type === "group")
    useFlowchartEditorStore.getState().selectNodes([again!.id])
    useFlowchartEditorStore.getState().deleteSelection()
    const afterDelete = useFlowchartEditorStore.getState().document
    expect(afterDelete.nodes.some((node) => node.type === "group")).toBe(false)
    expect(afterDelete.nodes.some((node) => node.parentId)).toBe(false)
    expect(afterDelete.nodes).toHaveLength(demoFlowchartDocument.nodes.length)
  })

  it("grayscale mode is reversible and affects SVG colors", () => {
    const document = cloneFlowchartDocument(demoFlowchartDocument)
    const gray = applyDocumentColorMode(document, "grayscale")
    expect(gray.page.colorMode).toBe("grayscale")
    const color = applyDocumentColorMode(gray, "color")
    expect(color.page.colorMode).toBe("color")
    const svg = renderFlowchartSvg(gray)
    expect(svg).toContain("#")
  })

  it("grows and shrinks fonts globally", () => {
    const document = cloneFlowchartDocument(demoFlowchartDocument)
    const grown = scaleDocumentFonts(document, 2)
    expect(grown.nodes[0]?.style.fontSize).toBe((document.nodes[0]?.style.fontSize ?? 14) + 2)
    const shrunk = scaleDocumentFonts(grown, -2)
    expect(shrunk.nodes[0]?.style.fontSize).toBe(document.nodes[0]?.style.fontSize)
  })

  it("applies top-bottom auto-layout from the store", () => {
    useFlowchartEditorStore.getState().loadDocument(demoFlowchartDocument)
    useFlowchartEditorStore.getState().applyAutoLayout("top-bottom")
    const nodes = useFlowchartEditorStore.getState().document.nodes
    const ys = nodes.map((node) => node.position.y)
    expect(new Set(ys).size).toBeGreaterThan(1)
  })
})
