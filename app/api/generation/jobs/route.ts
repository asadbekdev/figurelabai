import { apiError, apiSuccess, fieldErrorsFromZod } from "@/lib/api/envelope"
import { toSafeGenerationError } from "@/lib/generation/errors"
import { resolveModelProvider } from "@/lib/generation/resolve-provider"
import { getJobRunner } from "@/lib/jobs/runtime"
import { createGenerationJobRequestSchema, publicGenerationJob } from "@/lib/jobs/types"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a JSON object with an approved plan or revision.",
      retryable: false,
    })
  }

  const parsed = createGenerationJobRequestSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Approve a plan, then generate with an idempotency key.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      retryable: false,
    })
  }

  try {
    const job = await getJobRunner().create(
      parsed.data,
      resolveModelProvider(parsed.data.modelProvider)
    )
    return apiSuccess({ job: publicGenerationJob(job) })
  } catch (error) {
    const safe = toSafeGenerationError(error)
    return apiError(safe.status, {
      code: safe.code,
      message: safe.message,
      retryable: safe.retryable,
    })
  }
}
