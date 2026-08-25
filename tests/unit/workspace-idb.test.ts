import { afterEach, describe, expect, it, vi } from "vitest"

import { createIndexedDbStorage } from "../../lib/product/workspace-idb"

type FakeOpenRequest = {
  result: { close: ReturnType<typeof vi.fn> }
  error: Error | null
  onblocked: (() => void) | null
  onerror: (() => void) | null
  onsuccess: (() => void) | null
  onupgradeneeded: (() => void) | null
}

function request(): FakeOpenRequest {
  return {
    result: { close: vi.fn() },
    error: null,
    onblocked: null,
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
  } satisfies FakeOpenRequest
}

function installOpen(fake: FakeOpenRequest) {
  vi.stubGlobal("indexedDB", {
    open: vi.fn(() => fake as unknown as IDBOpenDBRequest),
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("IndexedDB workspace open", () => {
  it("fails with an actionable blocked error", async () => {
    const fake = request()
    installOpen(fake)
    const pending = createIndexedDbStorage()
    queueMicrotask(() => fake.onblocked?.())

    await expect(pending).rejects.toThrow("blocked by another tab")
  })

  it("fails with the underlying open error", async () => {
    const fake = request()
    fake.error = new Error("Browser denied storage")
    installOpen(fake)
    const pending = createIndexedDbStorage()
    queueMicrotask(() => fake.onerror?.())

    await expect(pending).rejects.toThrow("Browser denied storage")
  })

  it("times out and closes a database that succeeds too late", async () => {
    vi.useFakeTimers()
    const fake = request()
    installOpen(fake)
    const pending = createIndexedDbStorage()
    const assertion = expect(pending).rejects.toThrow("timed out")

    await vi.advanceTimersByTimeAsync(4_000)
    await assertion
    fake.onsuccess?.()
    expect(fake.result.close).toHaveBeenCalledOnce()
  })
})
