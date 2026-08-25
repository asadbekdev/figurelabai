import { apiError, apiSuccess } from "@/lib/api/envelope"
import { getJobRunner } from "@/lib/jobs/runtime"
import { publicGenerationJob } from "@/lib/jobs/types"

export const runtime = "nodejs"

function jobIdFrom(params: { jobId: string }): string | null {
  return /^[0-9a-f-]{36}$/i.test(params.jobId) ? params.jobId : null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params
  const id = jobIdFrom({ jobId })
  if (!id) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "That job id is not valid.",
      retryable: false,
    })
  }

  const runner = getJobRunner()
  const job = await runner.get(id)
  if (!job) {
    return apiError(404, {
      code: "JOB_NOT_FOUND",
      message: "That generation job is no longer available.",
      retryable: false,
    })
  }

  if (job.status === "queued" || job.status === "running") {
    await runner.enqueue(job.id)
  }

  return apiSuccess({ job: publicGenerationJob(job) })
}
