import { describe, expect, it } from "vitest"

import { demoFlowchartDocument } from "../../lib/flowchart/fixture"
import { cloneFlowchartDocument } from "../../lib/flowchart/schema"
import { checksumDocument } from "../../lib/product/workspace-checksum"
import { createWorkspaceRepository } from "../../lib/product/workspace-repository"
import { createMemoryStorage } from "../../lib/product/workspace-storage"

function repository() {
  return createWorkspaceRepository(createMemoryStorage())
}

describe("workspace repository", () => {
  it("reloads the same durable revision after save", async () => {
    const repo = repository()
    const created = await repo.createProject({
      title: demoFlowchartDocument.metadata.title,
      mode: "flowchart",
      document: demoFlowchartDocument,
      source: "generation",
    })

    const edited = cloneFlowchartDocument(demoFlowchartDocument)
    edited.nodes[0] = { ...edited.nodes[0], text: "Collected sample" }

    const saved = await repo.saveDocument(created.project.id, edited, 1)
    expect(saved.ok).toBe(true)
    if (!saved.ok) return

    const opened = await repo.openProject(created.project.id)
    expect(opened?.document?.revision).toBe(saved.revision)
    if (opened?.document?.content.kind !== "flowchart") throw new Error("Expected flowchart")
    expect(opened.document.content.nodes[0]?.text).toBe("Collected sample")
    expect(opened?.document?.checksum).toBe(checksumDocument(edited))
  })

  it("keeps both copies when two saves share a stale base revision", async () => {
    const repo = repository()
    const created = await repo.createProject({
      title: "Conflict fixture",
      mode: "flowchart",
      document: demoFlowchartDocument,
    })

    const firstEdit = cloneFlowchartDocument(demoFlowchartDocument)
    firstEdit.metadata = { ...firstEdit.metadata, title: "Stored copy" }
    const secondEdit = cloneFlowchartDocument(demoFlowchartDocument)
    secondEdit.metadata = { ...secondEdit.metadata, title: "Local copy" }

    const first = await repo.saveDocument(created.project.id, firstEdit, 1)
    const second = await repo.saveDocument(created.project.id, secondEdit, 1)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(false)
    if (first.ok === false || second.ok === true) return

    const opened = await repo.openProject(created.project.id)
    expect(opened?.document?.content.metadata.title).toBe("Stored copy")
    expect(second.conflict.local.metadata.title).toBe("Local copy")
    expect(second.conflict.stored.content.metadata.title).toBe("Stored copy")
    expect(opened?.document?.id).toBe(first.documentId)
  })

  it("discards a recovery snapshot after the stored copy is accepted", async () => {
    const repo = repository()
    const created = await repo.createProject({
      title: demoFlowchartDocument.metadata.title,
      mode: "flowchart",
      document: demoFlowchartDocument,
    })
    await repo.writeRecovery({
      projectId: created.project.id,
      baseRevision: 1,
      document: demoFlowchartDocument,
      updatedAt: "2026-08-25T00:00:00.000Z",
    })

    expect((await repo.openProject(created.project.id))?.recovery).not.toBeNull()
    await repo.discardRecovery(created.project.id)
    expect((await repo.openProject(created.project.id))?.recovery).toBeNull()
  })

  it("fails closed when a project points at a missing current document", async () => {
    const storage = createMemoryStorage()
    const repo = createWorkspaceRepository(storage)
    const created = await repo.createProject({
      title: demoFlowchartDocument.metadata.title,
      mode: "flowchart",
      document: demoFlowchartDocument,
    })
    if (!created.document) throw new Error("Expected a seeded document")
    await storage.deleteDocuments([created.document.id])

    await expect(repo.openProject(created.project.id)).rejects.toThrow(
      "current project document is missing"
    )
  })

  it("restores a named version as a new revision without mutating history", async () => {
    const repo = repository()
    const created = await repo.createProject({
      title: demoFlowchartDocument.metadata.title,
      mode: "flowchart",
      document: demoFlowchartDocument,
      source: "generation",
    })
    const generated = await repo.nameVersion(created.project.id, "Generated layout")

    const edited = cloneFlowchartDocument(demoFlowchartDocument)
    edited.nodes[0] = { ...edited.nodes[0], text: "Edited later" }
    const saved = await repo.saveDocument(created.project.id, edited, 1, "autosave")
    expect(saved.ok).toBe(true)

    const restored = await repo.restoreVersion(created.project.id, generated.id)
    expect(restored.document?.source).toBe("restore")
    if (restored.document?.content.kind !== "flowchart") throw new Error("Expected flowchart")
    expect(restored.document.content.nodes[0]?.text).toBe("Sample collection")
    expect(restored.document?.revision).toBe(3)

    const historical = await repo.openProject(created.project.id)
    const versions = historical?.versions ?? []
    expect(versions.some((version) => version.id === generated.id)).toBe(true)

    expect(historical?.document?.id).not.toBe(generated.documentId)
    expect(historical?.document?.checksum).not.toBeUndefined()
  })

  it("produces a stable checksum for the same document", () => {
    expect(checksumDocument(demoFlowchartDocument)).toBe(
      checksumDocument(cloneFlowchartDocument(demoFlowchartDocument))
    )
  })
})
