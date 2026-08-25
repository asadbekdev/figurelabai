import { figurePlanSchema } from "../generation/contracts"
import { GenerationError, toSafeGenerationError } from "../generation/errors"
import { layoutFlowchartDocument } from "../generation/layout"
import type { GeneratedImage, ModelProvider } from "../generation/model-provider"
import { resolveModelProvider } from "../generation/resolve-provider"
import { normalizeFlowchartDocument } from "../generation/normalize-flowchart"
import { flowchartDocumentSchema, type FlowchartDocument } from "../flowchart/schema"

import type { JobStore } from "./store"
import {
  isImageJobType,
  progressForStage,
  stagesForJob,
  type CreateGenerationJobRequest,
  type GenerationJob,
  type GenerationJobStage,
} from "./types"

export type JobRunner = {
  create(input: CreateGenerationJobRequest, provider: ModelProvider): Promise<GenerationJob>
  enqueue(jobId: string): Promise<void>
  get(jobId: string): Promise<GenerationJob | null>
  cancel(jobId: string): Promise<GenerationJob>
  retry(jobId: string): Promise<GenerationJob>
}

type RunnerOptions = {
  store: JobStore
  provider: ModelProvider
  stageDelayMs?: number
}

function nowIso(): string {
  return new Date().toISOString()
}

async function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) {
    signal.throwIfAborted()
    return
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException("The generation job was canceled.", "AbortError"))
    }
    if (signal.aborted) {
      onAbort()
      return
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

export function createJobRunner(options: RunnerOptions): JobRunner {
  const running = new Map<string, AbortController>()
  const { store, provider } = options
  const stageDelayMs = options.stageDelayMs ?? 0

  async function patch(
    id: string,
    update: Partial<GenerationJob> | ((job: GenerationJob) => Partial<GenerationJob>)
  ): Promise<GenerationJob> {
    const current = await store.get(id)
    if (!current) {
      throw new GenerationError("JOB_NOT_FOUND", "That generation job is no longer available.", {
        status: 404,
        retryable: false,
      })
    }
    const next = typeof update === "function" ? update(current) : update
    return store.put({ ...current, ...next })
  }

  async function advance(job: GenerationJob, stage: GenerationJobStage): Promise<GenerationJob> {
    return patch(job.id, {
      status: "running",
      stage,
      progress: progressForStage(job.type, stage, "running"),
      startedAt: job.startedAt ?? nowIso(),
      errorCode: null,
      safeErrorMessage: null,
    })
  }

  async function execute(jobId: string, signal: AbortSignal): Promise<void> {
    let job = await store.get(jobId)
    if (!job) return

    try {
      const sequence = stagesForJob(job.type)
      let raw: unknown
      let document: FlowchartDocument | null = null
      let image: GeneratedImage | null = null
      let imageWarning: string | null = null
      const activeProvider =
        job.provider === provider.id ? provider : resolveModelProvider(job.provider)

      for (const stage of sequence) {
        signal.throwIfAborted()
        job = await advance(job, stage)
        await wait(stageDelayMs, signal)

        if (stage === "validating") {
          if (job.type === "initial_generation") {
            figurePlanSchema.parse(job.inputSnapshot.plan)
          }
          if (job.type === "revision") {
            flowchartDocumentSchema.parse(job.inputSnapshot.document)
          }
        }

        if (stage === "planning" && job.inputSnapshot.plan) {
          figurePlanSchema.parse(job.inputSnapshot.plan)
        }

        if (stage === "drafting") {
          if (job.type === "illustration" || job.type === "illustration_revision") {
            const input = {
              prompt: job.inputSnapshot.prompt,
              aspectRatio: job.inputSnapshot.aspectRatio,
              style: job.inputSnapshot.style,
              inputMode: job.inputSnapshot.inputMode,
              visualConsistency: job.inputSnapshot.visualConsistency,
              paletteColors: job.inputSnapshot.paletteColors,
              imageSize: job.inputSnapshot.imageSize,
              offering: job.inputSnapshot.offering,
              sourceImage: job.inputSnapshot.sourceImage,
              referenceImage: job.inputSnapshot.referenceImage,
              purpose: "illustration" as const,
              seed: job.idempotencyKey,
            }
            image =
              job.type === "illustration_revision"
                ? await activeProvider.reviseIllustration(input, signal)
                : await activeProvider.createIllustration(input, signal)
            imageWarning = image.warning ?? null
          } else if (job.type === "plot") {
            image = await activeProvider.createPlot(
              {
                prompt: job.inputSnapshot.prompt,
                aspectRatio: job.inputSnapshot.aspectRatio,
                offering: job.inputSnapshot.offering,
                paletteColors: job.inputSnapshot.paletteColors,
                sourceImage: job.inputSnapshot.sourceImage,
                referenceImage: job.inputSnapshot.referenceImage,
                tabularData: job.inputSnapshot.tabularData ?? job.inputSnapshot.sourceText?.text,
                purpose: "plot",
                seed: job.idempotencyKey,
              },
              signal
            )
            imageWarning = image.warning ?? null
          } else {
            raw =
              job.type === "revision" && job.inputSnapshot.document
                ? await activeProvider.reviseFlowchart(
                    {
                      prompt: job.inputSnapshot.prompt,
                      document: job.inputSnapshot.document,
                      plan: job.inputSnapshot.plan,
                      sourceText: job.inputSnapshot.sourceText,
                      sourceImage: job.inputSnapshot.sourceImage,
                    },
                    signal
                  )
                : await activeProvider.createFlowchart(
                    {
                      prompt: job.inputSnapshot.prompt,
                      plan: job.inputSnapshot.plan,
                      sourceText: job.inputSnapshot.sourceText,
                      sourceImage: job.inputSnapshot.sourceImage,
                    },
                    signal
                  )
          }
        }

        if (stage === "laying_out") {
          document = normalizeFlowchartDocument(raw, {
            prompt: job.inputSnapshot.prompt,
            plan: job.inputSnapshot.plan,
          })
          document = layoutFlowchartDocument(
            document,
            job.inputSnapshot.plan?.structure.primaryDirection ?? "left-right"
          )
        }

        if (stage === "persisting") {
          if (isImageJobType(job.type)) {
            if (!image) {
              throw new GenerationError(
                "DOCUMENT_INVALID",
                "The illustration was missing before save.",
                { status: 422, retryable: true }
              )
            }
            await patch(job.id, {
              resultImage: {
                mimeType: image.mimeType,
                dataUrl: image.dataUrl,
              },
            })
          } else {
            if (!document) {
              throw new GenerationError(
                "DOCUMENT_INVALID",
                "The structural draft was missing before save.",
                { status: 422, retryable: true }
              )
            }
            await patch(job.id, {
              resultDocument: document,
            })
          }
        }
      }

      signal.throwIfAborted()
      const latest = await store.get(jobId)
      if (
        !latest ||
        latest.status === "canceled" ||
        latest.attemptCount !== job.attemptCount
      ) {
        return
      }
      await patch(jobId, {
        status: "succeeded",
        stage: "persisting",
        progress: 100,
        completedAt: nowIso(),
        errorCode: null,
        safeErrorMessage: imageWarning,
        retryable: false,
      })
    } catch (error) {
      if (signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        const current = await store.get(jobId)
        if (
          current?.status === "canceled" ||
          !current ||
          current.attemptCount !== job.attemptCount
        ) {
          return
        }
        await patch(jobId, {
          status: "canceled",
          completedAt: nowIso(),
          progress: null,
          retryable: true,
          errorCode: "CANCELED",
          safeErrorMessage: "Generation was canceled.",
        })
        return
      }

      const safe = toSafeGenerationError(error)
      const current = await store.get(jobId)
      if (!current || current.attemptCount !== job.attemptCount) return
      await patch(jobId, {
        status: "failed",
        completedAt: nowIso(),
        progress: null,
        retryable: safe.retryable,
        errorCode: safe.code,
        safeErrorMessage: safe.message,
      })
    }
  }

  async function enqueue(jobId: string): Promise<void> {
    const job = await store.get(jobId)
    if (!job) return
    if (job.status === "succeeded" || job.status === "canceled") return
    if (running.has(jobId)) return

    const controller = new AbortController()
    running.set(jobId, controller)
    void execute(jobId, controller.signal).finally(() => {
      if (running.get(jobId) === controller) running.delete(jobId)
    })
  }

  return {
    async create(input, selectedProvider) {
      const existing = await store.getByIdempotencyKey(input.idempotencyKey)
      if (existing) return existing

      const timestamp = nowIso()
      const job = await store.put({
        id: crypto.randomUUID(),
        projectId: input.projectId ?? null,
        type: input.type,
        status: "queued",
        stage: "queued",
        progress: 0,
        inputSnapshot: {
          prompt: input.prompt,
          plan: input.plan,
          document: input.document,
          baseRevision: input.baseRevision,
          sourceText: input.sourceText,
          sourceImage: input.sourceImage,
          referenceImage: input.referenceImage,
          aspectRatio: input.aspectRatio,
          style: input.style,
          inputMode: input.inputMode,
          visualConsistency: input.visualConsistency,
          paletteColors: input.paletteColors,
          imageSize: input.imageSize,
          offering: input.offering,
          tabularData: input.tabularData,
        },
        provider: selectedProvider.id,
        providerRequestId: null,
        idempotencyKey: input.idempotencyKey,
        attemptCount: 1,
        errorCode: null,
        safeErrorMessage: null,
        retryable: false,
        resultDocument: null,
        resultImage: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        startedAt: null,
        completedAt: null,
      })
      await enqueue(job.id)
      return job
    },
    enqueue,
    get: store.get,
    async cancel(jobId) {
      const job = await store.get(jobId)
      if (!job) {
        throw new GenerationError("JOB_NOT_FOUND", "That generation job is no longer available.", {
          status: 404,
          retryable: false,
        })
      }
      if (job.status === "succeeded") {
        throw new GenerationError(
          "JOB_NOT_CANCELABLE",
          "This generation already finished and cannot be canceled.",
          { status: 409, retryable: false }
        )
      }
      if (job.status === "canceled") return job

      running.get(jobId)?.abort()
      return store.put({
        ...job,
        status: "canceled",
        completedAt: nowIso(),
        progress: null,
        retryable: true,
        errorCode: "CANCELED",
        safeErrorMessage: "Generation was canceled.",
      })
    },
    async retry(jobId) {
      const job = await store.get(jobId)
      if (!job) {
        throw new GenerationError("JOB_NOT_FOUND", "That generation job is no longer available.", {
          status: 404,
          retryable: false,
        })
      }
      if (job.status !== "failed" && job.status !== "canceled") {
        throw new GenerationError(
          "JOB_NOT_RETRYABLE",
          "Only a failed or canceled job can be retried.",
          { status: 409, retryable: false }
        )
      }
      if (job.status === "failed" && !job.retryable) {
        throw new GenerationError(
          "JOB_NOT_RETRYABLE",
          "This failed generation cannot be retried.",
          { status: 409, retryable: false }
        )
      }

      running.get(jobId)?.abort()
      running.delete(jobId)

      const next = await store.put({
        ...job,
        status: "queued",
        stage: "queued",
        progress: 0,
        attemptCount: job.attemptCount + 1,
        errorCode: null,
        safeErrorMessage: null,
        retryable: false,
        resultDocument: null,
        resultImage: null,
        startedAt: null,
        completedAt: null,
      })
      await enqueue(next.id)
      return next
    },
  }
}

export function resumeOrphanedJobs(runner: JobRunner, jobs: GenerationJob[]): void {
  for (const job of jobs) {
    if (job.status === "queued" || job.status === "running") {
      void runner.enqueue(job.id)
    }
  }
}
