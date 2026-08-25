import { z } from "zod"

import { apiError, apiSuccess } from "@/lib/api/envelope"
import { SHARE_TOKEN_PATTERN } from "@/lib/sharing/contracts"
import { verifySharePassword } from "@/lib/sharing/password"
import { getShareStore } from "@/lib/sharing/runtime"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ token: string }> }

const unlockSchema = z
  .object({
    password: z.string().min(1).max(200),
  })
  .strict()

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params
  if (!SHARE_TOKEN_PATTERN.test(token)) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "That share token is malformed.",
      retryable: false,
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Send a JSON object with the share password.",
      retryable: false,
    })
  }

  const parsed = unlockSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Enter the share password.",
      retryable: false,
    })
  }

  const record = await getShareStore().get(token)
  if (!record) {
    return apiError(404, {
      code: "SHARE_NOT_FOUND",
      message: "That share link does not exist or was revoked.",
      retryable: false,
    })
  }

  if (record.passwordProtected) {
    if (!record.passwordSalt || !record.passwordHash) {
      return apiError(403, {
        code: "SHARE_LOCKED",
        message: "That share link is locked and cannot be opened.",
        retryable: false,
      })
    }
    const ok = await verifySharePassword(
      parsed.data.password,
      record.passwordSalt,
      record.passwordHash
    )
    if (!ok) {
      return apiError(403, {
        code: "SHARE_LOCKED",
        message: "That password does not match this share link.",
        retryable: false,
      })
    }
  }

  return apiSuccess({
    title: record.title,
    mode: record.mode,
    prompt: record.prompt,
    document: record.document,
    image: record.image,
    messages: record.messages,
    createdAt: record.createdAt,
  })
}
