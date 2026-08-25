import { apiError, apiSuccess } from "@/lib/api/envelope"
import { getJobRunner } from "@/lib/jobs/runtime"
import { authorizePublicApi } from "@/lib/public-api/auth"
import { publicFigureJob } from "@/lib/public-api/figures"

export const runtime = "nodejs"

function jobIdFrom(params: { jobId: string }): string | null {
  return /^[0-9a-f-]{36}$/i.test(params.jobId) ? params.jobId : null
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const denied = authorizePublicApi(request)
  if (denied) return denied

  const { jobId } = await context.params
  const id = jobIdFrom({ jobId })
  if (!id) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "That figure id is not valid.",
      retryable: false,
    })
  }

  const runner = getJobRunner()
  const job = await runner.get(id)
  if (!job) {
    return apiError(404, {
      code: "JOB_NOT_FOUND",
      message: "That figure job is no longer available.",
      retryable: false,
    })
  }

  if (job.status === "queued" || job.status === "running") {
    await runner.enqueue(job.id)
  }

  return apiSuccess({ figure: publicFigureJob(job) })
}
