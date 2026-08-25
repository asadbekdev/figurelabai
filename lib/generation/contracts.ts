import { z } from "zod"

import { flowchartDocumentSchema } from "../flowchart/schema"
import { imageOfferingSchema, type ImageOfferingId } from "./offerings"

export const figureOrientationSchema = z.enum([
  "portrait",
  "landscape",
  "square",
  "auto",
])

export const figureDirectionSchema = z.enum([
  "top-bottom",
  "left-right",
  "radial",
])

export const figurePlanSchema = z
  .object({
    planVersion: z.literal(1),
    mode: z.literal("flowchart"),
    title: z.string().min(1).max(300),
    goal: z.string().min(1).max(2_000),
    audience: z.string().max(300).optional(),
    orientation: figureOrientationSchema,
    structure: z
      .object({
        estimatedNodeCount: z.number().int().min(2).max(250),
        primaryDirection: figureDirectionSchema,
        sections: z
          .array(
            z
              .object({
                id: z.string().min(1).max(80),
                label: z.string().min(1).max(200),
                purpose: z.string().min(1).max(400),
              })
              .strict()
          )
          .min(1)
          .max(20),
      })
      .strict(),
    sourceAssetIds: z.array(z.string().min(1).max(120)).max(100),
    assumptions: z.array(z.string().min(1).max(400)).max(20),
    warnings: z.array(z.string().min(1).max(400)).max(20),
    estimatedSeconds: z.number().int().min(1).max(600).nullable(),
    estimatedCredits: z.number().int().min(0).max(10_000).nullable(),
  })
  .strict()

export type FigurePlan = z.infer<typeof figurePlanSchema>
export type FigureOrientation = z.infer<typeof figureOrientationSchema>
export type FigureDirection = z.infer<typeof figureDirectionSchema>

export const chatRoleSchema = z.enum(["user", "assistant"])

export const chatMessageSchema = z
  .object({
    role: chatRoleSchema,
    content: z.string().min(1).max(8_000),
  })
  .strict()

export const sourceImageSchema = z
  .object({
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
    data: z.string().min(32).max(12_000_000),
    name: z.string().min(1).max(200).optional(),
  })
  .strict()

export const sourceTextSchema = z
  .object({
    name: z.string().min(1).max(200),
    text: z.string().min(1).max(80_000),
  })
  .strict()

export const illustrationStyleSchema = z.enum([
  "publication",
  "flat",
  "2.5d",
  "3d",
  "schematic",
  "soft",
  "sketch",
  "line-art",
  "hand-drawn",
])

export const illustrationInputModeSchema = z.enum([
  "text",
  "image",
  "sketch",
  "enhance",
  "reference",
])

export const imageOutputSizeSchema = z.enum(["1k", "2k", "4k"])

export const modelProviderChoiceSchema = z.enum(["gemini", "fixture"])

export const planRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(8_000),
    sourceText: sourceTextSchema.optional(),
    sourceImage: sourceImageSchema.optional(),
    modelProvider: modelProviderChoiceSchema.optional(),
    idempotencyKey: z.string().min(8).max(120).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.prompt.length < 8 && !value.sourceText && !value.sourceImage) {
      context.addIssue({
        code: "custom",
        message: "Enter a prompt of at least 8 characters, or attach a source.",
        path: ["prompt"],
      })
    }
  })

export const flowchartRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(8_000),
    plan: figurePlanSchema.optional(),
    document: flowchartDocumentSchema.optional(),
    sourceText: sourceTextSchema.optional(),
    sourceImage: sourceImageSchema.optional(),
    idempotencyKey: z.string().min(8).max(120).optional(),
  })
  .strict()

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(20),
    modelProvider: modelProviderChoiceSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const last = value.messages.at(-1)
    if (last?.role !== "user") {
      context.addIssue({
        code: "custom",
        message: "The last message must come from the user.",
        path: ["messages"],
      })
    }
  })

export const imageAspectRatioSchema = z.enum([
  "auto",
  "square",
  "portrait",
  "landscape",
  "wide",
])

export const imageRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(4_000),
    aspectRatio: imageAspectRatioSchema.optional(),
    style: illustrationStyleSchema.optional(),
    inputMode: illustrationInputModeSchema.optional(),
    visualConsistency: z.boolean().optional(),
    paletteColors: z.array(z.string().regex(/^#[0-9a-f]{3,8}$/i)).max(8).optional(),
    imageSize: imageOutputSizeSchema.optional(),
    offering: imageOfferingSchema.optional(),
    sourceImage: sourceImageSchema.optional(),
    referenceImage: sourceImageSchema.optional(),
    tabularData: z.string().min(1).max(80_000).optional(),
    purpose: z.enum(["illustration", "plot"]).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.prompt.length < 8 && !value.sourceImage && !value.tabularData) {
      context.addIssue({
        code: "custom",
        message: "Enter a prompt of at least 8 characters, or attach a source.",
        path: ["prompt"],
      })
    }
  })

export type ImageAspectRatio = z.infer<typeof imageAspectRatioSchema>
export type IllustrationStyle = z.infer<typeof illustrationStyleSchema>
export type IllustrationInputMode = z.infer<typeof illustrationInputModeSchema>
export type ImageOutputSize = z.infer<typeof imageOutputSizeSchema>
export type { ImageOfferingId }
export type ModelProviderChoice = z.infer<typeof modelProviderChoiceSchema>
export type PlanRequest = z.infer<typeof planRequestSchema>
export type FlowchartRequest = z.infer<typeof flowchartRequestSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ImageRequest = z.infer<typeof imageRequestSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type SourceImage = z.infer<typeof sourceImageSchema>
export type SourceText = z.infer<typeof sourceTextSchema>
