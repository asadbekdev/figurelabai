import { apiError, apiSuccess, fieldErrorsFromZod } from "@/lib/api/envelope"
import { flowchartRequestSchema } from "@/lib/generation/contracts"
import { toSafeGenerationError } from "@/lib/generation/errors"
import { GEMINI_TEXT_MODEL } from "@/lib/generation/gemini"
import { createOrReviseFlowchart } from "@/lib/generation/provider"

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

  const parsed = flowchartRequestSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Enter a prompt of at least 8 characters.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      retryable: false,
    })
  }

  try {
    const document = await createOrReviseFlowchart(parsed.data, request.signal)
    return apiSuccess({
      document,
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
