import { apiError, apiSuccess } from "@/lib/api/envelope"
import { toSafeGenerationError } from "@/lib/generation/errors"
import { getJobRunner } from "@/lib/jobs/runtime"
import { publicGenerationJob } from "@/lib/jobs/types"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params

  try {
    const job = await getJobRunner().retry(jobId)
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
