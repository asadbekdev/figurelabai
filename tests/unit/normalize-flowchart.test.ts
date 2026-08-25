import { describe, expect, it } from "vitest"

import { normalizeFlowchartDocument } from "../../lib/generation/normalize-flowchart"
import { layoutFlowchartDocument, positionsNeedRelayout } from "../../lib/generation/layout"

describe("normalizeFlowchartDocument", () => {
  it("fills defaults and validates a loose model payload", () => {
    const document = normalizeFlowchartDocument(
      {
        nodes: [
          { id: "start", type: "terminator", text: "Collect sample", position: { x: 40, y: 80 } },
          { id: "end", type: "process", text: "Report", position: { x: 280, y: 80 } },
        ],
        edges: [{ sourceNodeId: "start", targetNodeId: "end", label: "Next" }],
      },
      { prompt: "Sample to report" }
    )

    expect(document.kind).toBe("flowchart")
    expect(document.schemaVersion).toBe(1)
    expect(document.metadata.title).toBe("Sample to report")
    expect(document.nodes).toHaveLength(2)
    expect(document.edges).toHaveLength(1)
    expect(document.nodes[0]?.style.fill).toMatch(/^#/)
    expect(document.edges[0]?.sourceNodeId).toBe("start")
  })

  it("drops dangling edges and unknown wrappers", () => {
    const document = normalizeFlowchartDocument({
      document: {
        metadata: { title: "Wrapped" },
        nodes: [{ id: "only", text: "Only node" }],
        edges: [{ sourceNodeId: "only", targetNodeId: "missing" }],
      },
    })

    expect(document.metadata.title).toBe("Wrapped")
    expect(document.nodes).toHaveLength(1)
    expect(document.edges).toHaveLength(0)
  })

  it("preserves canonical editing metadata across an AI revision", () => {
    const document = normalizeFlowchartDocument({
      page: { colorMode: "grayscale" },
      metadata: { title: "Preserve editor state" },
      nodes: [
        {
          id: "source",
          text: "Source",
          position: { x: 80, y: 80 },
          data: { citation: "PMID:123", nested: { panel: "A" } },
        },
        {
          id: "target",
          text: "Target",
          position: { x: 320, y: 80 },
        },
      ],
      edges: [
        {
          id: "source-target",
          sourceNodeId: "source",
          targetNodeId: "target",
          sourceHandle: "source-right",
          targetHandle: "target-left",
        },
      ],
    })

    expect(document.page.colorMode).toBe("grayscale")
    expect(document.nodes[0]?.data).toEqual({
      citation: "PMID:123",
      nested: { panel: "A" },
    })
    expect(document.edges[0]).toMatchObject({
      sourceHandle: "source-right",
      targetHandle: "target-left",
    })
  })
})

describe("layoutFlowchartDocument", () => {
  it("detects overlapping positions and spaces nodes", () => {
    const document = normalizeFlowchartDocument({
      metadata: { title: "Overlap" },
      nodes: [
        { id: "a", text: "A", position: { x: 0, y: 0 } },
        { id: "b", text: "B", position: { x: 0, y: 0 } },
      ],
      edges: [{ sourceNodeId: "a", targetNodeId: "b" }],
    })

    expect(positionsNeedRelayout(document.nodes)).toBe(false)
    const laidOut = layoutFlowchartDocument(document, "left-right")
    expect(laidOut.nodes[0]?.position.x).not.toBe(laidOut.nodes[1]?.position.x)
  })
})
