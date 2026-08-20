export class GenerationError extends Error {
  readonly code: string
  readonly status: number
  readonly retryable: boolean

  constructor(
    code: string,
    message: string,
    options: { status?: number; retryable?: boolean } = {}
  ) {
    super(message)
    this.name = "GenerationError"
    this.code = code
    this.status = options.status ?? 500
    this.retryable = options.retryable ?? false
  }
}

export function toSafeGenerationError(error: unknown): GenerationError {
  if (error instanceof GenerationError) return error

  if (error instanceof Error && error.name === "AbortError") {
    return new GenerationError(
      "TIMEOUT",
      "The model took too long to respond. Try a shorter prompt.",
      { status: 504, retryable: true }
    )
  }

  return new GenerationError(
    "MODEL_UNAVAILABLE",
    "The model is unavailable right now. Try again in a moment.",
    { status: 503, retryable: true }
  )
}
