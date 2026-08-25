import { z } from "zod"

// Portable artifact ink, not an app chrome token (same rule as flowchart palette).
export const VECTOR_INK = "#18181b"

const styleExtras = {
  opacity: z.number().finite().min(0).max(1).optional(),
  dash: z.number().finite().min(0).max(48).optional(),
}

const pathSchema = z
  .object({
    d: z.string().min(1).max(400_000),
    fill: z.string().min(1).max(40),
    ...styleExtras,
  })
  .strict()

const textObjectSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: z.literal("text"),
    x: z.number().finite(),
    y: z.number().finite(),
    text: z.string().min(1).max(400),
    fill: z.string().min(1).max(40),
    fontSize: z.number().finite().min(10).max(72),
    ...styleExtras,
  })
  .strict()

const rectObjectSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: z.literal("rect"),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().min(4).max(4_000),
    height: z.number().finite().min(4).max(4_000),
    fill: z.string().min(1).max(40),
    stroke: z.string().min(1).max(40).optional(),
    ...styleExtras,
  })
  .strict()

const frameObjectSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: z.literal("frame"),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().min(4).max(4_000),
    height: z.number().finite().min(4).max(4_000),
    stroke: z.string().min(1).max(40),
    fill: z.string().min(1).max(40).optional(),
    ...styleExtras,
  })
  .strict()

const pencilObjectSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: z.literal("pencil"),
    points: z
      .array(
        z
          .object({
            x: z.number().finite(),
            y: z.number().finite(),
          })
          .strict()
      )
      .min(2)
      .max(4_000),
    stroke: z.string().min(1).max(40),
    strokeWidth: z.number().finite().min(0.5).max(24),
    ...styleExtras,
  })
  .strict()

const lineObjectSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: z.literal("line"),
    x1: z.number().finite(),
    y1: z.number().finite(),
    x2: z.number().finite(),
    y2: z.number().finite(),
    stroke: z.string().min(1).max(40),
    strokeWidth: z.number().finite().min(0.5).max(24),
    ...styleExtras,
  })
  .strict()

const ellipseObjectSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: z.literal("ellipse"),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().min(4).max(4_000),
    height: z.number().finite().min(4).max(4_000),
    stroke: z.string().min(1).max(40),
    fill: z.string().min(1).max(40).optional(),
    ...styleExtras,
  })
  .strict()

const imageObjectSchema = z
  .object({
    id: z.string().min(1).max(80),
    type: z.literal("image"),
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().finite().min(4).max(4_000),
    height: z.number().finite().min(4).max(4_000),
    href: z.string().min(15).max(1_200_000),
    ...styleExtras,
  })
  .strict()

export const vectorObjectSchema = z.discriminatedUnion("type", [
  textObjectSchema,
  rectObjectSchema,
  frameObjectSchema,
  pencilObjectSchema,
  lineObjectSchema,
  ellipseObjectSchema,
  imageObjectSchema,
])

export const vectorDocumentSchema = z
  .object({
    kind: z.literal("vector"),
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(80),
    title: z.string().min(1).max(300),
    page: z
      .object({
        width: z.number().finite().min(8).max(8_000),
        height: z.number().finite().min(8).max(8_000),
        background: z.string().min(1).max(40),
      })
      .strict(),
    paths: z.array(pathSchema).max(4_000),
    objects: z.array(vectorObjectSchema).max(200),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict()

export type VectorPath = z.infer<typeof pathSchema>
export type VectorObject = z.infer<typeof vectorObjectSchema>
export type VectorDocument = z.infer<typeof vectorDocumentSchema>

export function parseVectorDocument(input: unknown): VectorDocument {
  return vectorDocumentSchema.parse(input)
}

export function createVectorDocumentId(): string {
  return crypto.randomUUID()
}

export function nowIso(): string {
  return new Date().toISOString()
}
