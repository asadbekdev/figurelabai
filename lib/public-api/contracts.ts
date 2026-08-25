import { z } from "zod"

import {
  illustrationInputModeSchema,
  illustrationStyleSchema,
  imageAspectRatioSchema,
  modelProviderChoiceSchema,
  sourceImageSchema,
} from "../generation/contracts"
import { imageOfferingSchema } from "../generation/offerings"
import type { FlowchartDocument } from "../flowchart/schema"
import type { GenerationJob, GenerationJobStatus, GenerationJobStage } from "../jobs/types"

export const publicFigureModeSchema = z.enum(["illustration", "flowchart", "plot"])

export const createPublicFigureRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(16_000),
    mode: publicFigureModeSchema.optional(),
    image: sourceImageSchema.optional(),
    offering: imageOfferingSchema.optional(),
    modelProvider: modelProviderChoiceSchema.optional(),
    aspectRatio: imageAspectRatioSchema.optional(),
    style: illustrationStyleSchema.optional(),
    inputMode: illustrationInputModeSchema.optional(),
    tabularData: z.string().min(1).max(80_000).optional(),
    idempotencyKey: z.string().min(8).max(120).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.prompt.length < 8 && !value.image && !value.tabularData) {
      context.addIssue({
        code: "custom",
        message: "Send a prompt of at least 8 characters, or include image or tabularData.",
        path: ["prompt"],
      })
    }
    if (value.mode === "plot" && !value.tabularData && !value.image && value.prompt.length < 8) {
      context.addIssue({
        code: "custom",
        message: "Plot mode needs a prompt, a pasted table (tabularData), or an image.",
        path: ["tabularData"],
      })
    }
  })

export type PublicFigureMode = z.infer<typeof publicFigureModeSchema>
export type CreatePublicFigureRequest = z.infer<typeof createPublicFigureRequestSchema>

export type PublicFigureResult =
  | {
      kind: "image"
      mimeType: string
      dataUrl: string
    }
  | {
      kind: "flowchart"
      document: FlowchartDocument
    }

export type PublicFigureJob = {
  id: string
  status: GenerationJobStatus
  mode: PublicFigureMode
  pollUrl: string
  progress: number | null
  stage: GenerationJobStage
  provider: GenerationJob["provider"]
  offering: GenerationJob["inputSnapshot"]["offering"] | null
  errorCode: string | null
  safeErrorMessage: string | null
  retryable: boolean
  result: PublicFigureResult | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

export function pollUrlForFigure(id: string): string {
  return `/api/v1/figures/${id}`
}

export function modeFromJob(job: GenerationJob): PublicFigureMode {
  if (job.type === "plot") return "plot"
  if (job.type === "initial_generation" || job.type === "revision") return "flowchart"
  return "illustration"
}
