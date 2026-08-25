import { apiError, apiSuccess, fieldErrorsFromZod } from "@/lib/api/envelope"
import { planRequestSchema } from "@/lib/generation/contracts"
import { toSafeGenerationError } from "@/lib/generation/errors"
import { resolveModelProvider } from "@/lib/generation/resolve-provider"

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

  const parsed = planRequestSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Enter a prompt of at least 8 characters.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      retryable: false,
    })
  }

  try {
    const provider = resolveModelProvider(parsed.data.modelProvider)
    const plan = await provider.planFigure(
      {
        prompt: parsed.data.prompt,
        sourceText: parsed.data.sourceText,
        sourceImage: parsed.data.sourceImage,
      },
      request.signal
    )
    return apiSuccess({ plan, provider: provider.id })
  } catch (error) {
    const safe = toSafeGenerationError(error)
    return apiError(safe.status, {
      code: safe.code,
      message: safe.message,
      retryable: safe.retryable,
    })
  }
}
