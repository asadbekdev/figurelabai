import { afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  EMPTY_GENERATION_THREAD,
  clearGenerationThread,
  readComposerSeed,
  readGenerationThread,
  writeComposerSeed,
  writeGenerationThread,
} from "@/lib/product/generation-thread"
import { buildFixturePlan } from "@/lib/generation/providers/fixture"

function installMemorySessionStorage() {
  const store = new Map<string, string>()
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => store.clear(),
  }
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage,
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
  })
}

describe("generation thread storage", () => {
  beforeAll(() => {
    installMemorySessionStorage()
  })

  afterEach(() => {
    clearGenerationThread()
    sessionStorage.clear()
  })

  it("returns an empty snapshot when nothing is stored", () => {
    expect(readGenerationThread()).toEqual(EMPTY_GENERATION_THREAD)
    expect(readComposerSeed()).toBeNull()
  })

  it("round-trips a plan review snapshot", () => {
    const plan = buildFixturePlan("Three-step PCR workflow")
    writeGenerationThread({
      ...EMPTY_GENERATION_THREAD,
      prompt: "Three-step PCR workflow",
      plan,
      phase: "review",
    })
    const stored = readGenerationThread()
    expect(stored.prompt).toBe("Three-step PCR workflow")
    expect(stored.plan).toEqual(plan)
    expect(stored.phase).toBe("review")
  })

  it("recovers a review without a valid plan as an editable prompt", () => {
    writeGenerationThread({
      ...EMPTY_GENERATION_THREAD,
      prompt: "Three-step PCR workflow",
      phase: "review",
    })

    expect(readGenerationThread()).toMatchObject({
      prompt: "Three-step PCR workflow",
      plan: null,
      phase: "idle",
    })
  })

  it("rejects malformed persisted plans instead of restoring a stuck review", () => {
    writeGenerationThread({
      ...EMPTY_GENERATION_THREAD,
      prompt: "Three-step PCR workflow",
      plan: { planVersion: 1, mode: "flowchart" } as never,
      phase: "review",
    })

    expect(readGenerationThread()).toMatchObject({ plan: null, phase: "idle" })
  })

  it("recovers an interrupted planning request as an editable prompt", () => {
    writeGenerationThread({
      ...EMPTY_GENERATION_THREAD,
      prompt: "Six-step RNA workflow",
      phase: "planning",
    })

    expect(readGenerationThread()).toMatchObject({
      prompt: "Six-step RNA workflow",
      phase: "idle",
    })
  })

  it("recovers generating state when no durable job exists", () => {
    writeGenerationThread({
      ...EMPTY_GENERATION_THREAD,
      prompt: "Six-step RNA workflow",
      phase: "generating",
    })

    expect(readGenerationThread().phase).toBe("idle")
  })

  it("restores generating state when a durable job exists", () => {
    writeGenerationThread({
      ...EMPTY_GENERATION_THREAD,
      prompt: "Six-step RNA workflow",
      phase: "generating",
      jobId: "job-durable",
    })

    expect(readGenerationThread().phase).toBe("generating")
  })

  it("round-trips a composer seed", () => {
    writeComposerSeed({ prompt: "Draw a blot", mode: "illustration" })
    expect(readComposerSeed()).toEqual({ prompt: "Draw a blot", mode: "illustration" })
  })
})
