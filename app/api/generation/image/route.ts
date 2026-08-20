import { apiError, apiSuccess, fieldErrorsFromZod } from "@/lib/api/envelope"
import { imageRequestSchema } from "@/lib/generation/contracts"
import { toSafeGenerationError } from "@/lib/generation/errors"
import { generateGeminiImage } from "@/lib/generation/gemini"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a JSON object with a prompt.",
      retryable: false,
    })
  }

  const parsed = imageRequestSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Enter a prompt of at least 8 characters.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      retryable: false,
    })
  }

  try {
    const image = await generateGeminiImage({
      prompt: parsed.data.prompt,
      aspectRatio: parsed.data.aspectRatio,
      signal: request.signal,
    })
    return apiSuccess({
      image: {
        mimeType: image.mimeType,
        dataUrl: `data:${image.mimeType};base64,${image.data}`,
      },
    })
  } catch (error) {
    const safe = toSafeGenerationError(error)
    return apiError(safe.status, {
      code: safe.code,
      message: safe.message,
      retryable: safe.retryable,
    })
  }
}
