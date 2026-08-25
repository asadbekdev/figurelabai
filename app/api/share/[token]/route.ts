import { apiError, apiSuccess } from "@/lib/api/envelope"
import { SHARE_TOKEN_PATTERN } from "@/lib/sharing/contracts"
import { getShareStore } from "@/lib/sharing/runtime"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ token: string }> }

function invalidToken() {
  return apiError(400, {
    code: "VALIDATION_ERROR",
    message: "That share token is malformed.",
    retryable: false,
  })
}

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params
  if (!SHARE_TOKEN_PATTERN.test(token)) return invalidToken()

  const record = await getShareStore().get(token)
  if (!record) {
    return apiError(404, {
      code: "SHARE_NOT_FOUND",
      message: "That share link does not exist or was revoked.",
      retryable: false,
    })
  }

  return apiSuccess({
    token: record.token,
    title: record.title,
    mode: record.mode,
    createdAt: record.createdAt,
    passwordProtected: record.passwordProtected,
  })
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { token } = await context.params
  if (!SHARE_TOKEN_PATTERN.test(token)) return invalidToken()

  const removed = await getShareStore().remove(token)
  if (!removed) {
    return apiError(404, {
      code: "SHARE_NOT_FOUND",
      message: "That share link does not exist or was already revoked.",
      retryable: false,
    })
  }

  return apiSuccess({ token, revoked: true })
}
