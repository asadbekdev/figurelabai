import { apiError, apiSuccess, fieldErrorsFromZod } from "@/lib/api/envelope"
import { chatRequestSchema } from "@/lib/generation/contracts"
import { toSafeGenerationError } from "@/lib/generation/errors"
import { GEMINI_TEXT_MODEL } from "@/lib/generation/gemini"
import { chatWithFigureLab } from "@/lib/generation/provider"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a JSON object with messages.",
      retryable: false,
    })
  }

  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send at least one user message.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      retryable: false,
    })
  }

  try {
    const text = await chatWithFigureLab(parsed.data.messages, request.signal)
    return apiSuccess({
      message: { role: "assistant" as const, content: text },
      model: GEMINI_TEXT_MODEL,
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
