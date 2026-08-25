import { describe, expect, it } from "vitest"

import { FixtureModelProvider } from "../../lib/generation/providers/fixture"
import { createJobRunner } from "../../lib/jobs/runner"
import { createMemoryJobStore } from "../../lib/jobs/store"
import type { GenerationJob } from "../../lib/jobs/types"
import { authorizePublicApi, readPublicApiKey } from "../../lib/public-api/auth"
import { createPublicFigureRequestSchema } from "../../lib/public-api/contracts"
import {
  createPublicFigureJob,
  publicFigureJob,
  resolvePublicFigureProviderChoice,
} from "../../lib/public-api/figures"

const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC"

async function waitForJob(
  get: (id: string) => Promise<GenerationJob | null>,
  id: string,
  predicate: (job: GenerationJob) => boolean,
  timeoutMs = 3_000
) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const job = await get(id)
    if (job && predicate(job)) return job
    await new Promise((resolve) => setTimeout(resolve, 15))
  }
  throw new Error("Timed out waiting for job transition")
}

describe("public figure request contract", () => {
  it("defaults to illustration and requires a usable prompt", () => {
    const parsed = createPublicFigureRequestSchema.parse({
      prompt: "Draw a labeled three-step PCR workflow.",
    })
    expect(parsed.mode).toBeUndefined()
    expect(createPublicFigureRequestSchema.safeParse({ prompt: "short" }).success).toBe(false)
  })

  it("accepts a short prompt when an image is attached", () => {
    const parsed = createPublicFigureRequestSchema.parse({
      prompt: "Fix",
      image: { mimeType: "image/png", data: TINY_PNG },
    })
    expect(parsed.image?.mimeType).toBe("image/png")
  })

  it("rejects unknown modes and extra fields", () => {
    expect(
      createPublicFigureRequestSchema.safeParse({
        prompt: "Draw a labeled three-step PCR workflow.",
        mode: "upscale",
      }).success
    ).toBe(false)
    expect(
      createPublicFigureRequestSchema.safeParse({
        prompt: "Draw a labeled three-step PCR workflow.",
        vendor: "flux",
      }).success
    ).toBe(false)
  })
})

describe("public API key", () => {
  it("is open when no key is configured", () => {
    const request = new Request("http://localhost/api/v1/figures", { method: "POST" })
    expect(authorizePublicApi(request, null)).toBeNull()
  })

  it("accepts X-Api-Key or Bearer when a key is set", () => {
    const missing = new Request("http://localhost/api/v1/figures", { method: "POST" })
    const denied = authorizePublicApi(missing, "local-secret")
    expect(denied?.status).toBe(401)

    const header = new Request("http://localhost/api/v1/figures", {
      method: "POST",
      headers: { "X-Api-Key": "local-secret" },
    })
    expect(authorizePublicApi(header, "local-secret")).toBeNull()

    const bearer = new Request("http://localhost/api/v1/figures", {
      method: "POST",
      headers: { Authorization: "Bearer local-secret" },
    })
    expect(readPublicApiKey(bearer)).toBe("local-secret")
    expect(authorizePublicApi(bearer, "local-secret")).toBeNull()
  })
})

describe("public figure jobs", () => {
  it("maps offerings to a real provider without inventing vendor APIs", () => {
    expect(resolvePublicFigureProviderChoice({ offering: "fixture" })).toBe("fixture")
    expect(resolvePublicFigureProviderChoice({ offering: "nano-banana" })).toBe("gemini")
    expect(resolvePublicFigureProviderChoice({ offering: "nano-banana-pro" })).toBe("gemini")
    expect(resolvePublicFigureProviderChoice({ modelProvider: "fixture", offering: "nano-banana" })).toBe(
      "fixture"
    )
  })

  it("creates an illustration job and returns a poll URL", async () => {
    const store = createMemoryJobStore()
    const provider = new FixtureModelProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 0 })
    const created = await createPublicFigureJob(
      {
        prompt: "Draw a labeled three-step PCR workflow.",
        mode: "illustration",
        offering: "fixture",
      },
      { runner, provider }
    )

    expect(created.pollUrl).toBe(`/api/v1/figures/${created.id}`)
    expect(created.mode).toBe("illustration")
    expect(created.provider).toBe("fixture")

    const finished = await waitForJob(runner.get, created.id, (job) => job.status === "succeeded")
    const publicJob = publicFigureJob(finished)
    expect(publicJob.result?.kind).toBe("image")
    if (publicJob.result?.kind === "image") {
      expect(publicJob.result.dataUrl.length).toBeGreaterThan(32)
    }
  })

  it("plans a flowchart on the server and returns a document", async () => {
    const store = createMemoryJobStore()
    const provider = new FixtureModelProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 0 })
    const created = await createPublicFigureJob(
      {
        prompt: "Collect sample, extract DNA, amplify, analyze",
        mode: "flowchart",
        offering: "fixture",
        idempotencyKey: "public-flowchart-1",
      },
      { runner, provider }
    )

    const again = await createPublicFigureJob(
      {
        prompt: "Collect sample, extract DNA, amplify, analyze",
        mode: "flowchart",
        offering: "fixture",
        idempotencyKey: "public-flowchart-1",
      },
      { runner, provider }
    )
    expect(again.id).toBe(created.id)

    const finished = await waitForJob(runner.get, created.id, (job) => job.status === "succeeded")
    const publicJob = publicFigureJob(finished)
    expect(publicJob.mode).toBe("flowchart")
    expect(publicJob.result?.kind).toBe("flowchart")
    if (publicJob.result?.kind === "flowchart") {
      expect(publicJob.result.document.nodes.length).toBeGreaterThan(2)
    }
  })
})
