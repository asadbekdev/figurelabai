import { z } from "zod"

import { renderVectorObjectSvg } from "@/lib/vector-canvas/render"
import { vectorObjectSchema, type VectorObject } from "@/lib/vector-canvas/schema"

const pageSchema = z
  .object({
    width: z.number().finite().min(8).max(8_000),
    height: z.number().finite().min(8).max(8_000),
  })
  .strict()

export const illustrationCommentSchema = z
  .object({
    id: z.string().min(1).max(80),
    x: z.number().finite(),
    y: z.number().finite(),
    text: z.string().min(1).max(800),
    createdAt: z.string().min(1),
  })
  .strict()

export type IllustrationComment = z.infer<typeof illustrationCommentSchema>

export const illustrationOverlaySchema = z
  .object({
    kind: z.literal("illustration-overlay"),
    schemaVersion: z.literal(1),
    projectId: z.string().min(1).max(80),
    assetId: z.string().min(1).max(80),
    page: pageSchema,
    objects: z.array(vectorObjectSchema).max(200),
    comments: z.array(illustrationCommentSchema).max(80),
    updatedAt: z.string().min(1),
  })
  .strict()

export type IllustrationOverlay = z.infer<typeof illustrationOverlaySchema>

export function parseIllustrationOverlay(input: unknown): IllustrationOverlay {
  if (input && typeof input === "object" && !("comments" in input)) {
    return illustrationOverlaySchema.parse({ ...input, comments: [] })
  }
  return illustrationOverlaySchema.parse(input)
}

export function createIllustrationOverlay(input: {
  projectId: string
  assetId: string
  width: number
  height: number
  objects?: VectorObject[]
  comments?: IllustrationComment[]
}): IllustrationOverlay {
  return parseIllustrationOverlay({
    kind: "illustration-overlay",
    schemaVersion: 1,
    projectId: input.projectId,
    assetId: input.assetId,
    page: {
      width: Math.max(8, Math.min(8_000, input.width)),
      height: Math.max(8, Math.min(8_000, input.height)),
    },
    objects: input.objects ?? [],
    comments: input.comments ?? [],
    updatedAt: new Date().toISOString(),
  })
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function num(value: number): string {
  return Number(value.toFixed(2)).toString()
}

export function renderIllustrationSvg(input: {
  title: string
  imageHref: string
  page: { width: number; height: number }
  objects: VectorObject[]
}): string {
  const { width, height } = input.page
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(
      width
    )}" height="${num(height)}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-label="${escapeXml(
      input.title
    )}">`,
    `<image href="${escapeXml(input.imageHref)}" xlink:href="${escapeXml(
      input.imageHref
    )}" width="${num(width)}" height="${num(height)}" preserveAspectRatio="xMidYMid meet" />`,
  ]

  for (const object of input.objects) {
    parts.push(renderVectorObjectSvg(object))
  }

  parts.push("</svg>")
  return parts.join("")
}

export function illustrationOverlayStorageKey(projectId: string): string {
  return `figurelab-illustration-overlay:v1:${projectId}`
}

export function readIllustrationOverlay(projectId: string): IllustrationOverlay | null {
  if (typeof localStorage === "undefined") return null
  const raw = localStorage.getItem(illustrationOverlayStorageKey(projectId))
  if (!raw) return null
  try {
    return parseIllustrationOverlay(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeIllustrationOverlay(overlay: IllustrationOverlay): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(
    illustrationOverlayStorageKey(overlay.projectId),
    JSON.stringify(parseIllustrationOverlay({ ...overlay, updatedAt: new Date().toISOString() }))
  )
}
