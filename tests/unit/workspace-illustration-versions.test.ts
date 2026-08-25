import { describe, expect, it } from "vitest"

import { createIllustrationDocument } from "@/lib/illustration/schema"
import { plotDocumentFromTable, parseTable } from "@/lib/plot/parse"
import { createWorkspaceRepository } from "@/lib/product/workspace-repository"
import { createMemoryStorage } from "@/lib/product/workspace-storage"

function repository() {
  return createWorkspaceRepository(createMemoryStorage())
}

describe("named versions for illustration and plot", () => {
  it("names and restores an illustration document", async () => {
    const repo = repository()
    const first = createIllustrationDocument({
      title: "Cell diagram",
      mimeType: "image/svg+xml",
      dataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"></svg>'),
    })
    const created = await repo.createProject({
      title: "Cell diagram",
      mode: "illustration",
      document: first,
      source: "generation",
    })
    const named = await repo.nameVersion(created.project.id, "First draft")
    const edited = createIllustrationDocument({
      title: "Cell diagram revised",
      mimeType: "image/svg+xml",
      dataUrl: "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#18181b"/></svg>'),
    })
    const saved = await repo.saveDocument(created.project.id, edited, 1, "autosave")
    expect(saved.ok).toBe(true)

    const restored = await repo.restoreVersion(created.project.id, named.id)
    expect(restored.document?.content.kind).toBe("illustration")
    if (restored.document?.content.kind !== "illustration") return
    expect(restored.document.content.metadata.title).toBe("Cell diagram")
    expect(restored.document.source).toBe("restore")
  })

  it("names and restores a plot document", async () => {
    const repo = repository()
    const table = parseTable("step,yield\nA,12\nB,19")
    expect(table).not.toBeNull()
    const document = plotDocumentFromTable({
      table: table!,
      title: "Yield",
    })
    expect(document).not.toBeNull()
    if (!document) return
    const created = await repo.createProject({
      title: "Yield",
      mode: "plot",
      document,
      source: "generation",
    })
    const named = await repo.nameVersion(created.project.id, "Baseline")
    const edited = {
      ...document,
      metadata: { ...document.metadata, title: "Yield edited" },
    }
    const saved = await repo.saveDocument(created.project.id, edited, 1, "autosave")
    expect(saved.ok).toBe(true)
    const restored = await repo.restoreVersion(created.project.id, named.id)
    expect(restored.document?.content.kind).toBe("plot")
    if (restored.document?.content.kind !== "plot") return
    expect(restored.document.content.metadata.title).toBe("Yield")
  })
})
