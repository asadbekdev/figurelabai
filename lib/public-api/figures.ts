import { providerChoiceForOffering } from "../generation/offerings"
import type { ModelProvider } from "../generation/model-provider"
import type { JobRunner } from "../jobs/runner"
import type { CreateGenerationJobRequest, GenerationJob, GenerationJobType } from "../jobs/types"

import {
  modeFromJob,
  pollUrlForFigure,
  type CreatePublicFigureRequest,
  type PublicFigureJob,
  type PublicFigureResult,
} from "./contracts"

export function resolvePublicFigureProviderChoice(
  input: Pick<CreatePublicFigureRequest, "modelProvider" | "offering">
): CreateGenerationJobRequest["modelProvider"] {
  return input.modelProvider ?? providerChoiceForOffering(input.offering)
}

function jobTypeForMode(mode: CreatePublicFigureRequest["mode"]): GenerationJobType {
  if (mode === "flowchart") return "initial_generation"
  if (mode === "plot") return "plot"
  return "illustration"
}

export function publicFigureJob(job: GenerationJob): PublicFigureJob {
  let result: PublicFigureResult | null = null
  if (job.resultImage) {
    result = {
      kind: "image",
      mimeType: job.resultImage.mimeType,
      dataUrl: job.resultImage.dataUrl,
    }
  } else if (job.resultDocument) {
    result = {
      kind: "flowchart",
      document: job.resultDocument,
    }
  }

  return {
    id: job.id,
    status: job.status,
    mode: modeFromJob(job),
    pollUrl: pollUrlForFigure(job.id),
    progress: job.progress,
    stage: job.stage,
    provider: job.provider,
    offering: job.inputSnapshot.offering ?? null,
    errorCode: job.errorCode,
    safeErrorMessage: job.safeErrorMessage,
    retryable: job.retryable,
    result,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
  }
}

export async function createPublicFigureJob(
  input: CreatePublicFigureRequest,
  options: {
    runner: JobRunner
    provider: ModelProvider
    signal?: AbortSignal
  }
): Promise<PublicFigureJob> {
  const mode = input.mode ?? "illustration"
  const type = jobTypeForMode(mode)
  const image = input.image
  const plan =
    type === "initial_generation"
      ? await options.provider.planFigure(
          { prompt: input.prompt, sourceImage: image },
          options.signal ?? new AbortController().signal
        )
      : undefined

  const job = await options.runner.create(
    {
      type,
      prompt: input.prompt,
      plan,
      sourceImage: image,
      referenceImage: mode === "illustration" && image ? image : undefined,
      aspectRatio: input.aspectRatio,
      style: mode === "illustration" ? input.style : undefined,
      inputMode:
        mode === "illustration" ? (input.inputMode ?? (image ? "image" : "text")) : undefined,
      offering: input.offering,
      tabularData: input.tabularData,
      modelProvider: options.provider.id,
      idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    },
    options.provider
  )

  return publicFigureJob(job)
}
