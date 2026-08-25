import type { ApiResult } from "./envelope"

export class ApiRequestError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly requestId: string
  readonly fieldErrors?: Record<string, string[]>

  constructor(error: {
    code: string
    message: string
    retryable: boolean
    requestId: string
    fieldErrors?: Record<string, string[]>
  }) {
    super(error.message)
    this.name = "ApiRequestError"
    this.code = error.code
    this.retryable = error.retryable
    this.requestId = error.requestId
    this.fieldErrors = error.fieldErrors
  }
}

async function readJson<T>(response: Response): Promise<T> {
  let payload: ApiResult<T>
  try {
    payload = (await response.json()) as ApiResult<T>
  } catch {
    throw new ApiRequestError({
      code: "MODEL_UNAVAILABLE",
      message: "The server returned an unreadable response.",
      retryable: true,
      requestId: "unknown",
    })
  }

  if (!payload.ok) {
    throw new ApiRequestError({
      ...payload.error,
      requestId: payload.requestId,
    })
  }

  return payload.data
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: "GET", signal })
  return readJson<T>(response)
}

export async function postJson<T>(url: string, body: unknown = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  })
  return readJson<T>(response)
}
