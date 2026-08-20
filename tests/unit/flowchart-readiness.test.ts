import { describe, expect, it } from "vitest"

import { demoFlowchartDocument } from "../../lib/flowchart/fixture"
import { runFlowchartReadiness } from "../../lib/flowchart/readiness"
import {
  cloneFlowchartDocument,
  type FlowchartDocument,
} from "../../lib/flowchart/schema"

describe("runFlowchartReadiness", () => {
  it("passes the deterministic demo document", () => {
    const report = runFlowchartReadiness(demoFlowchartDocument)

    expect(report).toEqual({
      ready: true,
      errors: 0,
      warnings: 0,
      issues: [],
    })
  })

  it("links blocking issues to their semantic objects", () => {
    const document = cloneFlowchartDocument(demoFlowchartDocument)
    const sample = document.nodes.find((node) => node.id === "sample")
    const extract = document.nodes.find((node) => node.id === "extract")

    if (!sample || !extract) throw new Error("Fixture nodes are missing")

    sample.text = ""
    sample.position = { x: 0, y: 0 }
    sample.style.fontSize = 8
    sample.style.fill = "#ffffff"
    sample.style.textColor = "#f8fafc"
    extract.position = { ...sample.position }

    const report = runFlowchartReadiness(document)
    const codes = new Set(report.issues.map((item) => item.code))

    expect(report.ready).toBe(false)
    for (const code of [
      "empty-label",
      "outside-page",
      "text-too-small",
      "low-contrast",
      "overlapping-nodes",
    ] as const) {
      expect(codes.has(code)).toBe(true)
    }
    expect(
      report.issues.find((item) => item.code === "empty-label")?.nodeIds
    ).toEqual(["sample"])
  })

  it("reports disconnected islands and dangling connections", () => {
    const document = cloneFlowchartDocument(
      demoFlowchartDocument
    ) as FlowchartDocument
    document.nodes.push({
      id: "island",
      type: "note",
      position: { x: 720, y: 520 },
      size: { width: 160, height: 72 },
      text: "Intentional island",
      style: {
        fill: "#ffffff",
        stroke: "#475569",
        textColor: "#0f172a",
        fontSize: 14,
        radius: 8,
        strokeWidth: 2,
      },
    })
    document.edges.push({
      id: "dangling",
      sourceNodeId: "island",
      targetNodeId: "missing",
      type: "straight",
      style: {
        color: "#475569",
        width: 2,
        markerEnd: "arrow",
        dashed: false,
      },
    })

    const report = runFlowchartReadiness(document)

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unreachable-node",
          severity: "warning",
          nodeIds: ["island"],
        }),
        expect.objectContaining({
          code: "dangling-edge",
          severity: "error",
          edgeIds: ["dangling"],
        }),
      ])
    )
  })
})
