import { z } from "zod"

import { flowchartDocumentSchema } from "@/lib/flowchart/schema"

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

export const planRequestSchema = z
  .object({
    prompt: z.string().trim().min(8).max(8_000),
    idempotencyKey: z.string().min(8).max(120).optional(),
  })
  .strict()

export const flowchartRequestSchema = z
  .object({
    prompt: z.string().trim().min(8).max(8_000),
    plan: figurePlanSchema.optional(),
    document: flowchartDocumentSchema.optional(),
    idempotencyKey: z.string().min(8).max(120).optional(),
  })
  .strict()

export const chatRequestSchema = z
  .object({
    messages: z.array(chatMessageSchema).min(1).max(20),
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
])

export const imageRequestSchema = z
  .object({
    prompt: z.string().trim().min(8).max(4_000),
    aspectRatio: imageAspectRatioSchema.optional(),
  })
  .strict()

export type PlanRequest = z.infer<typeof planRequestSchema>
export type FlowchartRequest = z.infer<typeof flowchartRequestSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ImageRequest = z.infer<typeof imageRequestSchema>
export type ChatMessage = z.infer<typeof chatMessageSchema>
