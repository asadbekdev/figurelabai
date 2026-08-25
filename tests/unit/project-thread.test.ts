import { describe, expect, it } from "vitest"

import { demoFlowchartDocument } from "../../lib/flowchart/fixture"
import { createWorkspaceRepository } from "../../lib/product/workspace-repository"
import { createMemoryStorage } from "../../lib/product/workspace-storage"

describe("project thread persistence", () => {
  it("reloads prompt, plan, and messages with the project", async () => {
    const repo = createWorkspaceRepository(createMemoryStorage())
    const created = await repo.createProject({
      title: demoFlowchartDocument.metadata.title,
      mode: "flowchart",
      document: demoFlowchartDocument,
      source: "generation",
      thread: {
        prompt: "Show a three-step PCR workflow",
        plan: null,
        messages: [
          {
            id: "msg-1",
            authorType: "user",
            content: "Show a three-step PCR workflow",
            createdAt: "2026-08-20T00:00:00.000Z",
          },
        ],
      },
    })

    await repo.appendMessage(created.project.id, {
      authorType: "assistant",
      content: "The flowchart draft is ready to edit.",
    })

    const opened = await repo.openProject(created.project.id)
    expect(opened?.thread?.prompt).toBe("Show a three-step PCR workflow")
    expect(opened?.thread?.messages).toHaveLength(2)
    expect(opened?.thread?.messages[1]?.content).toMatch(/ready to edit/)
  })

  it("stores an illustration asset on the project", async () => {
    const repo = createWorkspaceRepository(createMemoryStorage())
    const created = await repo.createProject({
      title: "PCR illustration",
      mode: "illustration",
      thread: {
        prompt: "Draw a PCR workflow",
        plan: null,
        messages: [],
      },
    })
    const asset = await repo.addAsset({
      projectId: created.project.id,
      kind: "generated_asset",
      mimeType: "image/svg+xml",
      dataUrl: "data:image/svg+xml;charset=utf-8,<svg></svg>",
      prompt: "Draw a PCR workflow",
    })

    const opened = await repo.openProject(created.project.id)
    expect(opened?.project.mode).toBe("illustration")
    expect(opened?.asset?.id).toBe(asset.id)
    expect(opened?.document).toBeNull()
  })
})
