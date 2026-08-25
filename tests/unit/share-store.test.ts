import { describe, expect, it } from "vitest"

import { demoFlowchartDocument } from "@/lib/flowchart/fixture"
import { shareSnapshotSchema, type ShareSnapshot } from "@/lib/sharing/contracts"
import { createMemoryShareStore } from "@/lib/sharing/store"

function flowchartSnapshot(): ShareSnapshot {
  return shareSnapshotSchema.parse({
    title: "PCR workflow",
    mode: "flowchart",
    prompt: "Show a three-step PCR workflow.",
    document: demoFlowchartDocument,
    messages: [
      { authorType: "user", content: "Show a three-step PCR workflow.", createdAt: new Date().toISOString() },
    ],
  })
}

describe("share snapshot contract", () => {
  it("requires a document for flowchart shares", () => {
    const result = shareSnapshotSchema.safeParse({
      title: "Missing doc",
      mode: "flowchart",
      prompt: "",
      messages: [],
    })
    expect(result.success).toBe(false)
  })

  it("requires an image for illustration shares", () => {
    const result = shareSnapshotSchema.safeParse({
      title: "Missing image",
      mode: "illustration",
      prompt: "",
      messages: [],
    })
    expect(result.success).toBe(false)
  })
})

describe("memory share store", () => {
  it("creates, reads, and removes a share record", async () => {
    const store = createMemoryShareStore()
    const record = await store.create(flowchartSnapshot())

    expect(record.token).toMatch(/^[0-9a-f]{32}$/)
    expect(record.title).toBe("PCR workflow")

    const fetched = await store.get(record.token)
    expect(fetched?.document?.nodes.length).toBe(demoFlowchartDocument.nodes.length)

    expect(await store.remove(record.token)).toBe(true)
    expect(await store.get(record.token)).toBeNull()
    expect(await store.remove(record.token)).toBe(false)
  })

  it("never reuses tokens", async () => {
    const store = createMemoryShareStore()
    const first = await store.create(flowchartSnapshot())
    const second = await store.create(flowchartSnapshot())
    expect(first.token).not.toBe(second.token)
  })

  it("stores an optional password hash and keeps the plaintext out of the record", async () => {
    const store = createMemoryShareStore()
    const record = await store.create(flowchartSnapshot(), { password: "lab-notes" })
    expect(record.passwordProtected).toBe(true)
    expect(record.passwordHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(record)).not.toContain("lab-notes")
  })
})
