import { randomUUID } from "node:crypto"

export type ApiSuccess<T> = {
  ok: true
  data: T
  requestId: string
}

export type ApiErrorBody = {
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
  retryable: boolean
}

export type ApiError = {
  ok: false
  error: ApiErrorBody
  requestId: string
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

export function createRequestId(): string {
  return randomUUID()
}

export function apiSuccess<T>(data: T, requestId = createRequestId()): Response {
  const body: ApiSuccess<T> = { ok: true, data, requestId }
  return Response.json(body)
}

export function apiError(
  status: number,
  error: ApiErrorBody,
  requestId = createRequestId()
): Response {
  const body: ApiError = { ok: false, error, requestId }
  return Response.json(body, { status })
}

export function fieldErrorsFromZod(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>
}): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "form"
    fieldErrors[key] ??= []
    fieldErrors[key].push(issue.message)
  }
  return fieldErrors
}
