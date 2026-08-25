import { describe, expect, it } from "vitest"

import { demoFlowchartDocument } from "@/lib/flowchart/fixture"
import { parseImportedFlowchartJson } from "@/lib/flowchart/import"

describe("parseImportedFlowchartJson", () => {
  it("reloads a source JSON export into a valid document", () => {
    const imported = parseImportedFlowchartJson(JSON.stringify(demoFlowchartDocument))
    expect(imported.kind).toBe("flowchart")
    expect(imported.metadata.title).toBe(demoFlowchartDocument.metadata.title)
    expect(imported.nodes).toHaveLength(demoFlowchartDocument.nodes.length)
    expect(imported.edges).toHaveLength(demoFlowchartDocument.edges.length)
    expect(imported.nodes[0]?.id).toBe(demoFlowchartDocument.nodes[0]?.id)
  })

  it("rejects invalid JSON", () => {
    expect(() => parseImportedFlowchartJson("{not json")).toThrow("not valid JSON")
  })

  it("rejects JSON that is not a flowchart document", () => {
    expect(() => parseImportedFlowchartJson(JSON.stringify({ title: "Nope" }))).toThrow(
      "not a valid FigureLab flowchart document"
    )
    expect(() =>
      parseImportedFlowchartJson(JSON.stringify({ kind: "plot", schemaVersion: 1 }))
    ).toThrow("not a valid FigureLab flowchart document")
  })
})
