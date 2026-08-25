import { z } from "zod"

import { illustrationCommentSchema } from "./overlay"
import { vectorObjectSchema } from "@/lib/vector-canvas/schema"

export const illustrationDocumentSchema = z
  .object({
    kind: z.literal("illustration"),
    schemaVersion: z.literal(1),
    page: z
      .object({
        width: z.number().finite().min(8).max(8_000),
        height: z.number().finite().min(8).max(8_000),
      })
      .strict(),
    image: z
      .object({
        mimeType: z.string().min(1).max(120),
        dataUrl: z.string().min(1),
      })
      .strict(),
    objects: z.array(vectorObjectSchema).max(200),
    comments: z.array(illustrationCommentSchema).max(80),
    metadata: z
      .object({
        title: z.string().min(1).max(300),
        description: z.string().max(2_000).optional(),
        sourceAssetIds: z.array(z.string().min(1).max(120)).max(100),
      })
      .strict(),
  })
  .strict()

export type IllustrationDocument = z.infer<typeof illustrationDocumentSchema>

export function parseIllustrationDocument(input: unknown): IllustrationDocument {
  return illustrationDocumentSchema.parse(input)
}

export function createIllustrationDocument(input: {
  title: string
  mimeType: string
  dataUrl: string
  width?: number
  height?: number
  objects?: IllustrationDocument["objects"]
  comments?: IllustrationDocument["comments"]
}): IllustrationDocument {
  return parseIllustrationDocument({
    kind: "illustration",
    schemaVersion: 1,
    page: {
      width: input.width ?? 1280,
      height: input.height ?? 720,
    },
    image: {
      mimeType: input.mimeType,
      dataUrl: input.dataUrl,
    },
    objects: input.objects ?? [],
    comments: input.comments ?? [],
    metadata: {
      title: input.title.trim() || "Illustration",
      sourceAssetIds: [],
    },
  })
}
