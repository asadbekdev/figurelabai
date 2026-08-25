import { afterEach, describe, expect, it, vi } from "vitest"

import { demoFlowchartDocument } from "../../lib/flowchart/fixture"

afterEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
})

describe("workspace runtime fallback", () => {
  it("surfaces blocked durable storage and refuses project creation", async () => {
    const openRequest = {
      error: null,
      onblocked: null as (() => void) | null,
      onerror: null as (() => void) | null,
      onsuccess: null as (() => void) | null,
      onupgradeneeded: null as (() => void) | null,
    }
    vi.stubGlobal("indexedDB", {
      open: vi.fn(() => {
        queueMicrotask(() => openRequest.onblocked?.())
        return openRequest as unknown as IDBOpenDBRequest
      }),
    })

    const { useWorkspaceStore } = await import("../../lib/product/workspace-store")
    await useWorkspaceStore.getState().hydrate()

    expect(useWorkspaceStore.getState()).toMatchObject({
      hydrated: true,
      offline: true,
    })
    expect(useWorkspaceStore.getState().error).toMatch(/Durable local storage is unavailable/)
    await expect(
      useWorkspaceStore.getState().createFlowchartProject({
        title: "Blocked storage fixture",
        document: demoFlowchartDocument,
      })
    ).rejects.toThrow("Durable local storage is unavailable")
  })
})
