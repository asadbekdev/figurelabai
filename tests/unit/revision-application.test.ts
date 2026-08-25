import { describe, expect, it } from "vitest"

import { demoFlowchartDocument } from "../../lib/flowchart/fixture"
import {
  fingerprintFlowchartRevisionBase,
  resolveFlowchartRevisionCompletion,
  summarizeFlowchartRevisionPatch,
} from "../../lib/flowchart/revision-application"
import { cloneFlowchartDocument } from "../../lib/flowchart/schema"

describe("flowchart revision completion", () => {
  it("does not replace manual edits made after an AI revision was submitted", () => {
    const submitted = cloneFlowchartDocument(demoFlowchartDocument)
    const manuallyEdited = cloneFlowchartDocument(submitted)
    manuallyEdited.nodes[0] = {
      ...manuallyEdited.nodes[0],
      text: "Manual label added while AI was working",
    }
    const aiResult = cloneFlowchartDocument(submitted)
    aiResult.metadata = { ...aiResult.metadata, title: "AI revised title" }

    const completion = resolveFlowchartRevisionCompletion({
      baseRevision: 4,
      baseDocumentChecksum: fingerprintFlowchartRevisionBase(submitted),
      // The manual edit has not autosaved yet, so the persisted revision is still unchanged.
      currentRevision: 4,
      currentDocument: manuallyEdited,
      resultDocument: aiResult,
    })

    expect(completion.status).toBe("conflict")
    if (completion.status !== "conflict") throw new Error("Expected a revision conflict")
    expect(completion.reason).toBe("document_changed")
    expect(completion.currentDocument.nodes[0]?.text).toBe(
      "Manual label added while AI was working"
    )
    expect(completion.resultDocument.metadata.title).toBe("AI revised title")
  })

  it("applies a validated AI result when the submitted figure is still current", () => {
    const submitted = cloneFlowchartDocument(demoFlowchartDocument)
    const aiResult = cloneFlowchartDocument(submitted)
    aiResult.metadata = { ...aiResult.metadata, title: "AI revised title" }

    const completion = resolveFlowchartRevisionCompletion({
      baseRevision: 4,
      baseDocumentChecksum: fingerprintFlowchartRevisionBase(submitted),
      currentRevision: 4,
      currentDocument: submitted,
      resultDocument: aiResult,
    })

    expect(completion.status).toBe("apply")
    if (completion.status !== "apply") throw new Error("Expected the revision to apply")
    expect(completion.document.metadata.title).toBe("AI revised title")
  })

  it("ignores viewport-only movement when checking for newer content", () => {
    const submitted = cloneFlowchartDocument(demoFlowchartDocument)
    const panned = cloneFlowchartDocument(submitted)
    panned.viewport = { x: 280, y: -120, zoom: 1.45 }

    const completion = resolveFlowchartRevisionCompletion({
      baseRevision: 4,
      baseDocumentChecksum: fingerprintFlowchartRevisionBase(submitted),
      currentRevision: 4,
      currentDocument: panned,
      resultDocument: submitted,
    })

    expect(completion.status).toBe("apply")
    if (completion.status !== "apply") throw new Error("Expected the revision to apply")
    expect(completion.document.viewport).toEqual(panned.viewport)
  })

  it("summarizes an AI patch before it is accepted", () => {
    const current = cloneFlowchartDocument(demoFlowchartDocument)
    const result = cloneFlowchartDocument(current)
    result.nodes[0] = { ...result.nodes[0], text: "Revised start" }
    result.nodes.push({
      ...result.nodes[0],
      id: "ai-added-node",
      text: "New verification step",
      position: { x: 720, y: 120 },
    })

    const changes = summarizeFlowchartRevisionPatch(current, result)

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "edit", title: "Revised start" }),
        expect.objectContaining({ action: "add", title: "New verification step" }),
      ])
    )
  })

  it("summarizes document-level changes that acceptance will apply", () => {
    const current = cloneFlowchartDocument(demoFlowchartDocument)
    const result = cloneFlowchartDocument(current)
    result.page = { ...result.page, background: "#f8fafc", padding: result.page.padding + 8 }
    result.metadata = {
      ...result.metadata,
      description: "Revised methods figure",
      sourceAssetIds: ["source-1"],
    }

    const changes = summarizeFlowchartRevisionPatch(current, result)

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "document", title: "Figure page" }),
        expect.objectContaining({ kind: "document", title: "Figure description" }),
        expect.objectContaining({ kind: "document", title: "Figure sources" }),
      ])
    )
  })

  it("summarizes node and connection reading-order changes", () => {
    const current = cloneFlowchartDocument(demoFlowchartDocument)
    const result = cloneFlowchartDocument(current)
    result.nodes = [...result.nodes].reverse()
    result.edges = [...result.edges].reverse()

    const changes = summarizeFlowchartRevisionPatch(current, result)

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Node reading order" }),
        expect.objectContaining({ title: "Connection reading order" }),
      ])
    )
  })
})
