import { apiError, apiSuccess, fieldErrorsFromZod } from "@/lib/api/envelope"
import { shareSnapshotSchema } from "@/lib/sharing/contracts"
import { getShareStore } from "@/lib/sharing/runtime"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a JSON object with the project snapshot to share.",
      retryable: false,
    })
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  const password = typeof raw.password === "string" ? raw.password : undefined
  if (password !== undefined && (password.length < 4 || password.length > 200)) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Share passwords must be 4–200 characters.",
      retryable: false,
    })
  }
  const snapshot = { ...raw }
  delete snapshot.password
  const parsed = shareSnapshotSchema.safeParse(snapshot)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "The share snapshot was incomplete or invalid.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
      retryable: false,
    })
  }

  const record = await getShareStore().create(parsed.data, { password })
  return apiSuccess({
    token: record.token,
    path: `/share/${record.token}`,
    createdAt: record.createdAt,
    passwordProtected: record.passwordProtected,
  })
}
