import { z } from "zod"

import { flowchartDocumentSchema } from "../flowchart/schema"
import { fingerprintFlowchartRevisionBase } from "../flowchart/revision-application"
import {
  figurePlanSchema,
  illustrationInputModeSchema,
  illustrationStyleSchema,
  imageAspectRatioSchema,
  imageOutputSizeSchema,
  modelProviderChoiceSchema,
  sourceImageSchema,
  sourceTextSchema,
} from "../generation/contracts"
import { imageOfferingSchema } from "../generation/offerings"

export const generationJobTypeSchema = z.enum([
  "initial_generation",
  "revision",
  "illustration",
  "illustration_revision",
  "plot",
])

export const generationJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
])

export const generationJobStageSchema = z.enum([
  "queued",
  "validating",
  "planning",
  "drafting",
  "laying_out",
  "rendering_preview",
  "persisting",
])

export const generatedImageResultSchema = z
  .object({
    mimeType: z.string().min(1).max(120),
    dataUrl: z.string().min(1),
  })
  .strict()

export const generationJobInputSchema = z
  .object({
    prompt: z.string().min(1).max(16_000),
    plan: figurePlanSchema.optional(),
    document: flowchartDocumentSchema.optional(),
    baseRevision: z.number().int().min(0).optional(),
    sourceText: sourceTextSchema.optional(),
    sourceImage: sourceImageSchema.optional(),
    referenceImage: sourceImageSchema.optional(),
    aspectRatio: imageAspectRatioSchema.optional(),
    style: illustrationStyleSchema.optional(),
    inputMode: illustrationInputModeSchema.optional(),
    visualConsistency: z.boolean().optional(),
    paletteColors: z.array(z.string().regex(/^#[0-9a-f]{3,8}$/i)).max(8).optional(),
    imageSize: imageOutputSizeSchema.optional(),
    offering: imageOfferingSchema.optional(),
    tabularData: z.string().min(1).max(80_000).optional(),
  })
  .strict()

export const generationJobSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().nullable(),
    type: generationJobTypeSchema,
    status: generationJobStatusSchema,
    stage: generationJobStageSchema,
    progress: z.number().int().min(0).max(100).nullable(),
    inputSnapshot: generationJobInputSchema,
    provider: z.enum(["fixture", "gemini"]),
    providerRequestId: z.string().nullable(),
    idempotencyKey: z.string().min(8).max(120),
    attemptCount: z.number().int().min(0).max(20),
    errorCode: z.string().nullable(),
    safeErrorMessage: z.string().nullable(),
    retryable: z.boolean(),
    resultDocument: flowchartDocumentSchema.nullable(),
    resultImage: generatedImageResultSchema.nullable().default(null),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    startedAt: z.string().nullable(),
    completedAt: z.string().nullable(),
  })
  .strict()

export const createGenerationJobRequestSchema = z
  .object({
    type: generationJobTypeSchema,
    prompt: z.string().trim().min(1).max(16_000),
    plan: figurePlanSchema.optional(),
    document: flowchartDocumentSchema.optional(),
    baseRevision: z.number().int().min(0).optional(),
    sourceText: sourceTextSchema.optional(),
    sourceImage: sourceImageSchema.optional(),
    referenceImage: sourceImageSchema.optional(),
    aspectRatio: imageAspectRatioSchema.optional(),
    style: illustrationStyleSchema.optional(),
    inputMode: illustrationInputModeSchema.optional(),
    visualConsistency: z.boolean().optional(),
    paletteColors: z.array(z.string().regex(/^#[0-9a-f]{3,8}$/i)).max(8).optional(),
    imageSize: imageOutputSizeSchema.optional(),
    offering: imageOfferingSchema.optional(),
    tabularData: z.string().min(1).max(80_000).optional(),
    projectId: z.string().min(1).max(80).optional(),
    modelProvider: modelProviderChoiceSchema.optional(),
    idempotencyKey: z.string().min(8).max(120),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.type === "initial_generation" && !value.plan) {
      context.addIssue({
        code: "custom",
        message: "Approve a plan before generating.",
        path: ["plan"],
      })
    }
    if (value.type === "revision" && !value.document) {
      context.addIssue({
        code: "custom",
        message: "A current document is required to revise.",
        path: ["document"],
      })
    }
    if (value.type === "plot" && !value.tabularData && !value.sourceText && value.prompt.length < 8) {
      context.addIssue({
        code: "custom",
        message: "Paste a table or attach a CSV to generate a plot.",
        path: ["tabularData"],
      })
    }
    if (
      (value.type === "initial_generation" || value.type === "revision") &&
      value.prompt.length < 8 &&
      !value.sourceText &&
      !value.sourceImage
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter a prompt of at least 8 characters, or attach a source.",
        path: ["prompt"],
      })
    }
  })

export type GenerationJobType = z.infer<typeof generationJobTypeSchema>
export type GenerationJobStatus = z.infer<typeof generationJobStatusSchema>
export type GenerationJobStage = z.infer<typeof generationJobStageSchema>
export type GenerationJob = z.infer<typeof generationJobSchema>
export type CreateGenerationJobRequest = z.infer<typeof createGenerationJobRequestSchema>
export type GeneratedImageResult = z.infer<typeof generatedImageResultSchema>

export const INITIAL_JOB_STAGES: GenerationJobStage[] = [
  "validating",
  "planning",
  "drafting",
  "laying_out",
  "rendering_preview",
  "persisting",
]

export const REVISION_JOB_STAGES: GenerationJobStage[] = [
  "validating",
  "drafting",
  "laying_out",
  "persisting",
]

export const IMAGE_JOB_STAGES: GenerationJobStage[] = [
  "validating",
  "drafting",
  "persisting",
]

export const JOB_STAGE_LABELS: Record<GenerationJobStage, string> = {
  queued: "Queued",
  validating: "Reading your request",
  planning: "Planning the layout",
  drafting: "Drafting the figure",
  laying_out: "Arranging the layout",
  rendering_preview: "Preparing the preview",
  persisting: "Saving the draft",
}

export function isImageJobType(type: GenerationJobType): boolean {
  return type === "illustration" || type === "illustration_revision" || type === "plot"
}

export function stagesForJob(type: GenerationJobType): GenerationJobStage[] {
  if (type === "revision") return REVISION_JOB_STAGES
  if (isImageJobType(type)) return IMAGE_JOB_STAGES
  return INITIAL_JOB_STAGES
}

export function stageLabelsForJob(type: GenerationJobType): string[] {
  return stagesForJob(type).map((stage) => {
    if (stage === "drafting" && type === "plot") return "Drawing the chart"
    if (stage === "drafting" && isImageJobType(type)) return "Rendering the illustration"
    if (stage === "drafting") return "Drafting the graph"
    return JOB_STAGE_LABELS[stage]
  })
}

export function progressForStage(
  type: GenerationJobType,
  stage: GenerationJobStage,
  status: GenerationJobStatus
): number | null {
  if (status === "queued") return 0
  if (status === "succeeded") return 100
  if (status === "canceled" || status === "failed") return null
  const stages = stagesForJob(type)
  const index = stages.indexOf(stage)
  if (index < 0) return null
  return Math.round((index / stages.length) * 100)
}

export function publicGenerationJob(job: GenerationJob) {
  return {
    id: job.id,
    projectId: job.projectId,
    type: job.type,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    provider: job.provider,
    attemptCount: job.attemptCount,
    errorCode: job.errorCode,
    safeErrorMessage: job.safeErrorMessage,
    retryable: job.retryable,
    resultDocument: job.resultDocument,
    resultImage: job.resultImage,
    baseRevision: job.inputSnapshot.baseRevision ?? null,
    baseDocumentChecksum:
      job.type === "revision" && job.inputSnapshot.document
        ? fingerprintFlowchartRevisionBase(job.inputSnapshot.document)
        : null,
    stages: stageLabelsForJob(job.type),
    activeStage:
      job.status === "succeeded"
        ? stagesForJob(job.type).length
        : Math.max(0, stagesForJob(job.type).indexOf(job.stage)),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  }
}

export type PublicGenerationJob = ReturnType<typeof publicGenerationJob>
