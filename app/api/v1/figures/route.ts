import { apiError, apiSuccess, fieldErrorsFromZod } from "@/lib/api/envelope"
import { toSafeGenerationError } from "@/lib/generation/errors"
import { resolveModelProvider } from "@/lib/generation/resolve-provider"
import { getJobRunner } from "@/lib/jobs/runtime"
import { authorizePublicApi } from "@/lib/public-api/auth"
import { createPublicFigureRequestSchema } from "@/lib/public-api/contracts"
import { createPublicFigureJob, resolvePublicFigureProviderChoice } from "@/lib/public-api/figures"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  const denied = authorizePublicApi(request)
  if (denied) return denied

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a JSON object with a prompt and optional mode or image.",
      retryable: false,
    })
  }

  const parsed = createPublicFigureRequestSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a prompt of at least 8 characters, or include image or tabularData.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      retryable: false,
    })
  }

  try {
    const provider = resolveModelProvider(resolvePublicFigureProviderChoice(parsed.data))
    const figure = await createPublicFigureJob(parsed.data, {
      runner: getJobRunner(),
      provider,
      signal: request.signal,
    })
    return apiSuccess({ figure })
  } catch (error) {
    const safe = toSafeGenerationError(error)
    return apiError(safe.status, {
      code: safe.code,
      message: safe.message,
      retryable: safe.retryable,
    })
  }
}
