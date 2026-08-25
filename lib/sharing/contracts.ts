import { z } from "zod"

import { flowchartDocumentSchema } from "../flowchart/schema"

export const SHARE_TOKEN_PATTERN = /^[0-9a-f]{32}$/

export const shareMessageSchema = z
  .object({
    authorType: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(16_000),
    createdAt: z.string().min(1),
  })
  .strict()

export const shareSnapshotSchema = z
  .object({
    title: z.string().min(1).max(300),
    mode: z.enum(["flowchart", "illustration", "plot"]),
    prompt: z.string().max(16_000),
    document: flowchartDocumentSchema.optional(),
    image: z
      .object({
        mimeType: z.string().min(1).max(120),
        dataUrl: z.string().min(1).max(14_000_000),
      })
      .strict()
      .optional(),
    messages: z.array(shareMessageSchema).max(50),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode === "flowchart" && !value.document) {
      context.addIssue({
        code: "custom",
        message: "A flowchart share needs the current document.",
        path: ["document"],
      })
    }
    if (value.mode !== "flowchart" && !value.image) {
      context.addIssue({
        code: "custom",
        message: "An image share needs the current figure.",
        path: ["image"],
      })
    }
  })

export const shareRecordSchema = shareSnapshotSchema.and(
  z.object({
    token: z.string().regex(SHARE_TOKEN_PATTERN),
    createdAt: z.string().min(1),
    passwordProtected: z.boolean().default(false),
    passwordSalt: z.string().min(8).max(80).optional(),
    passwordHash: z.string().min(16).max(128).optional(),
  })
)

export type ShareSnapshot = z.infer<typeof shareSnapshotSchema>
export type ShareRecord = z.infer<typeof shareRecordSchema>
