import { describe, expect, it } from "vitest"

import { createProjectSaveQueue } from "../../lib/product/save-queue"

describe("project save queue", () => {
  it("does not resolve an explicit flush until a queued save has drained", async () => {
    const releases: Array<() => void> = []
    let calls = 0
    const queue = createProjectSaveQueue(async () => {
      calls += 1
      await new Promise<void>((resolve) => releases.push(resolve))
    })

    const first = queue.flush()
    const explicitFlush = queue.flush()
    let explicitResolved = false
    void explicitFlush.then(() => {
      explicitResolved = true
    })

    expect(calls).toBe(1)
    releases.shift()?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toBe(2)
    expect(explicitResolved).toBe(false)

    releases.shift()?.()
    await explicitFlush
    await first
    expect(explicitResolved).toBe(true)
  })
})
