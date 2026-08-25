import { describe, expect, it } from "vitest"

import { FixtureModelProvider, resetFixtureFailures } from "../../lib/generation/providers/fixture"
import { GenerationError } from "../../lib/generation/errors"
import { createJobRunner } from "../../lib/jobs/runner"
import { createMemoryJobStore } from "../../lib/jobs/store"
import type { CreateGenerationJobRequest, GenerationJob } from "../../lib/jobs/types"
import { buildFixturePlan } from "../../lib/generation/providers/fixture"

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

function initialRequest(prompt: string, key = crypto.randomUUID()): CreateGenerationJobRequest {
  return {
    type: "initial_generation",
    prompt,
    plan: buildFixturePlan(prompt),
    idempotencyKey: key,
  }
}

describe("JobRunner", () => {
  it("runs fixture stages and persists a structural draft", async () => {
    const store = createMemoryJobStore()
    const provider = new FixtureModelProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 0 })
    const created = await runner.create(
      initialRequest("Collect sample, extract DNA, amplify, analyze"),
      provider
    )

    const finished = await waitForJob(
      runner.get,
      created.id,
      (job) => job.status === "succeeded"
    )

    expect(finished.stage).toBe("persisting")
    expect(finished.progress).toBe(100)
    expect(finished.resultDocument?.nodes.length).toBeGreaterThan(2)
    expect(finished.provider).toBe("fixture")
  })

  it("returns the same job for a repeated idempotency key", async () => {
    const store = createMemoryJobStore()
    const provider = new FixtureModelProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 0 })
    const request = initialRequest("Collect, extract, analyze", "idempotency-key-1")

    const first = await runner.create(request, provider)
    const second = await runner.create(request, provider)

    expect(second.id).toBe(first.id)
    const jobs = await store.list()
    expect(jobs).toHaveLength(1)
  })

  it("cancels a running job", async () => {
    const store = createMemoryJobStore()
    const provider = new FixtureModelProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 80 })
    const created = await runner.create(initialRequest("Collect, extract, analyze"), provider)

    const canceled = await runner.cancel(created.id)
    expect(canceled.status).toBe("canceled")
    expect(canceled.retryable).toBe(true)

    const settled = await waitForJob(
      runner.get,
      created.id,
      (job) => job.status === "canceled"
    )
    expect(settled.resultDocument).toBeNull()
  })

  it("retries a failed fixture draft without creating a second job", async () => {
    resetFixtureFailures()
    const store = createMemoryJobStore()
    const provider = new FixtureModelProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 0 })
    const created = await runner.create(
      initialRequest("Please fail the draft then recover the PCR figure"),
      provider
    )

    await waitForJob(runner.get, created.id, (job) => job.status === "failed")
    const retried = await runner.retry(created.id)
    expect(retried.id).toBe(created.id)
    expect(retried.attemptCount).toBe(2)

    const finished = await waitForJob(
      runner.get,
      created.id,
      (job) => job.status === "succeeded"
    )
    expect(finished.resultDocument).toBeTruthy()
    expect(await store.list()).toHaveLength(1)
  })

  it("keeps a retried attempt active while the canceled attempt settles", async () => {
    class RetryRaceProvider extends FixtureModelProvider {
      calls = 0
      secondSignal: AbortSignal | null = null
      releaseFirst: (() => void) | null = null
      private firstStartedResolve!: () => void
      private secondStartedResolve!: () => void
      readonly firstStarted = new Promise<void>((resolve) => {
        this.firstStartedResolve = resolve
      })
      readonly secondStarted = new Promise<void>((resolve) => {
        this.secondStartedResolve = resolve
      })

      override async createFlowchart(
        input: Parameters<FixtureModelProvider["createFlowchart"]>[0],
        signal: AbortSignal
      ): Promise<unknown> {
        void input
        this.calls += 1
        if (this.calls === 1) {
          this.firstStartedResolve()
          return new Promise((_resolve, reject) => {
            this.releaseFirst = () =>
              reject(new DOMException("The first attempt settled.", "AbortError"))
          })
        }

        this.secondSignal = signal
        this.secondStartedResolve()
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("The retry was canceled.", "AbortError")),
            { once: true }
          )
        })
      }
    }

    const store = createMemoryJobStore()
    const provider = new RetryRaceProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 0 })
    const created = await runner.create(initialRequest("Collect, extract, analyze"), provider)
    await provider.firstStarted

    await runner.cancel(created.id)
    const retried = await runner.retry(created.id)
    expect(retried.attemptCount).toBe(2)
    await provider.secondStarted

    provider.releaseFirst?.()
    await new Promise((resolve) => setTimeout(resolve, 20))
    const activeRetry = await runner.get(created.id)
    expect(activeRetry?.attemptCount).toBe(2)
    expect(activeRetry?.status).toBe("running")

    await runner.cancel(created.id)
    expect(provider.secondSignal?.aborted).toBe(true)
    const canceled = await waitForJob(runner.get, created.id, (job) => job.status === "canceled")
    expect(canceled.attemptCount).toBe(2)
  })

  it("rejects retry for a terminal non-retryable failure", async () => {
    class NonRetryableProvider extends FixtureModelProvider {
      override async createFlowchart(): Promise<unknown> {
        throw new GenerationError("VALIDATION_ERROR", "The fixture is invalid.", {
          status: 400,
          retryable: false,
        })
      }
    }

    const store = createMemoryJobStore()
    const provider = new NonRetryableProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 0 })
    const created = await runner.create(initialRequest("Collect, extract, analyze"), provider)
    const failed = await waitForJob(runner.get, created.id, (job) => job.status === "failed")

    expect(failed.retryable).toBe(false)
    await expect(runner.retry(created.id)).rejects.toMatchObject({
      code: "JOB_NOT_RETRYABLE",
      retryable: false,
    })
  })

  it("runs illustration jobs and persists an image result", async () => {
    const store = createMemoryJobStore()
    const provider = new FixtureModelProvider()
    const runner = createJobRunner({ store, provider, stageDelayMs: 0 })
    const created = await runner.create(
      {
        type: "illustration",
        prompt: "Draw a PCR workstation illustration",
        offering: "nano-banana-pro",
        idempotencyKey: crypto.randomUUID(),
      },
      provider
    )

    const finished = await waitForJob(
      runner.get,
      created.id,
      (job) => job.status === "succeeded"
    )

    expect(finished.resultDocument).toBeNull()
    expect(finished.resultImage?.dataUrl).toMatch(/^data:image\//)
    expect(finished.inputSnapshot.offering).toBe("nano-banana-pro")
    expect(decodeURIComponent(finished.resultImage!.dataUrl)).toContain("Nano Banana Pro")
  })
})
