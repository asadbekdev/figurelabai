import { z } from "zod"

import { apiError, apiSuccess, fieldErrorsFromZod } from "@/lib/api/envelope"
import { toSafeGenerationError } from "@/lib/generation/errors"
import { authorizePublicApi } from "@/lib/public-api/auth"
import { VECTORIZE_DETAILS, VECTORIZE_PREPROCESS } from "@/lib/vectorize/options"
import { vectorizeRaster } from "@/lib/vectorize/trace"

export const runtime = "nodejs"
export const maxDuration = 60

const vectorizeRequestSchema = z
  .object({
    image: z
      .object({
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
        data: z.string().min(32).max(12_000_000),
      })
      .strict(),
    detail: z.enum(VECTORIZE_DETAILS).optional(),
    preprocess: z.enum(VECTORIZE_PREPROCESS).optional(),
    threshold: z.number().int().min(0).max(255).optional(),
    inkColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .optional(),
  })
  .strict()

export async function POST(request: Request) {
  const denied = authorizePublicApi(request)
  if (denied) return denied

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a JSON object with a raster image to trace.",
      retryable: false,
    })
  }

  const parsed = vectorizeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a PNG, JPEG, or WebP image as base64.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      retryable: false,
    })
  }

  try {
    const result = await vectorizeRaster({
      data: Buffer.from(parsed.data.image.data, "base64"),
      detail: parsed.data.detail,
      preprocess: parsed.data.preprocess,
      threshold: parsed.data.threshold,
      inkColor: parsed.data.inkColor,
    })
    return apiSuccess(result)
  } catch (error) {
    const safe = toSafeGenerationError(error)
    return apiError(safe.status, {
      code: safe.code,
      message: safe.message,
      retryable: safe.retryable,
    })
  }
}
