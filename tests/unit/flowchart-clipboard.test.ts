import { describe, expect, it } from "vitest"

import { demoFlowchartDocument } from "../../lib/flowchart/fixture"
import { useFlowchartEditorStore } from "../../lib/flowchart/store"

describe("flowchart clipboard and auto-layout", () => {
  it("copies selected nodes and pastes them with new ids", () => {
    useFlowchartEditorStore.getState().loadDocument(demoFlowchartDocument)
    const firstId = demoFlowchartDocument.nodes[0]?.id
    expect(firstId).toBeTruthy()
    useFlowchartEditorStore.getState().selectNodes([firstId!])

    const payload = useFlowchartEditorStore.getState().copySelection()
    expect(payload?.nodes).toHaveLength(1)

    const before = useFlowchartEditorStore.getState().document.nodes.length
    useFlowchartEditorStore.getState().pasteClipboard(payload!)
    const after = useFlowchartEditorStore.getState().document
    expect(after.nodes.length).toBe(before + 1)
    expect(after.nodes.at(-1)?.id).not.toBe(firstId)
  })

  it("applies a user-triggered left-to-right layout", () => {
    useFlowchartEditorStore.getState().loadDocument(demoFlowchartDocument)
    useFlowchartEditorStore.getState().applyAutoLayout("left-right")
    const nodes = useFlowchartEditorStore.getState().document.nodes
    expect(nodes.length).toBeGreaterThan(1)
    const xs = nodes.map((node) => node.position.x)
    expect(new Set(xs).size).toBeGreaterThan(1)
  })
})
