import { GenerationError } from "./errors"

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"

export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-flash-latest"
export const GEMINI_IMAGE_MODELS = (
  process.env.GEMINI_IMAGE_MODEL ??
  "gemini-2.5-flash-image,gemini-2.5-flash-image-preview,gemini-2.0-flash-preview-image-generation"
)
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean)

const DEFAULT_TIMEOUT_MS = 45_000

type GeminiPart = {
  text?: string
  inlineData?: {
    mimeType?: string
    data?: string
  }
  inline_data?: {
    mime_type?: string
    data?: string
  }
}

type GeminiCandidate = {
  content?: { parts?: GeminiPart[] }
  finishReason?: string
}

type GeminiErrorPayload = {
  error?: {
    code?: number
    status?: string
    message?: string
  }
}

type GeminiResponse = GeminiErrorPayload & {
  candidates?: GeminiCandidate[]
}

export type GeminiInlineImage = {
  mimeType: string
  data: string
}

export type GeminiContent = {
  role?: "user" | "model"
  parts: Array<{ text: string }>
}

type GenerateContentOptions = {
  model: string
  contents: GeminiContent[]
  systemInstruction?: string
  responseMimeType?: "text/plain" | "application/json"
  responseModalities?: Array<"TEXT" | "IMAGE">
  temperature?: number
  timeoutMs?: number
  signal?: AbortSignal
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new GenerationError(
      "MODEL_NOT_CONFIGURED",
      "Gemini is not configured on this server. Add GEMINI_API_KEY to .env.local.",
      { status: 503, retryable: false }
    )
  }
  return apiKey
}

function sanitizeProviderMessage(message: string | undefined): string {
  if (!message) return "The model could not complete this request."
  return message
    .replace(/key[=:]\s*["']?[\w.-]+/gi, "key=[redacted]")
    .replace(/AQ\.[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]")
    .slice(0, 240)
}

function mapHttpError(status: number, payload: GeminiErrorPayload): GenerationError {
  const providerStatus = payload.error?.status ?? ""
  const safeMessage = sanitizeProviderMessage(payload.error?.message)

  if (status === 400 || providerStatus === "INVALID_ARGUMENT") {
    return new GenerationError(
      "VALIDATION_ERROR",
      "The model could not use that request. Try a clearer prompt.",
      { status: 400, retryable: false }
    )
  }
  if (status === 401 || status === 403 || providerStatus === "PERMISSION_DENIED") {
    return new GenerationError(
      "MODEL_NOT_CONFIGURED",
      "This server is not allowed to use the selected Gemini model.",
      { status: 503, retryable: false }
    )
  }
  if (status === 404 || providerStatus === "NOT_FOUND") {
    return new GenerationError(
      "MODEL_UNAVAILABLE",
      "The selected Gemini model is not available for this key.",
      { status: 503, retryable: true }
    )
  }
  if (status === 429 || providerStatus === "RESOURCE_EXHAUSTED") {
    return new GenerationError(
      "RATE_LIMITED",
      "The model is busy. Wait a moment and try again.",
      { status: 429, retryable: true }
    )
  }
  if (status >= 500) {
    return new GenerationError(
      "MODEL_UNAVAILABLE",
      "The model is unavailable right now. Try again in a moment.",
      { status: 503, retryable: true }
    )
  }

  return new GenerationError("MODEL_UNAVAILABLE", safeMessage, {
    status: 502,
    retryable: true,
  })
}

export async function generateGeminiContent(
  options: GenerateContentOptions
): Promise<GeminiResponse> {
  const apiKey = getApiKey()
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  )

  const onAbort = () => controller.abort()
  options.signal?.addEventListener("abort", onAbort)

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${encodeURIComponent(options.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: options.contents,
          ...(options.systemInstruction
            ? {
                systemInstruction: {
                  parts: [{ text: options.systemInstruction }],
                },
              }
            : {}),
          generationConfig: {
            temperature: options.temperature ?? 0.4,
            ...(options.responseMimeType
              ? { responseMimeType: options.responseMimeType }
              : {}),
            ...(options.responseModalities
              ? { responseModalities: options.responseModalities }
              : {}),
          },
        }),
        signal: controller.signal,
      }
    )

    const payload = (await response.json()) as GeminiResponse
    if (!response.ok) {
      throw mapHttpError(response.status, payload)
    }
    return payload
  } catch (error) {
    if (error instanceof GenerationError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      throw new GenerationError(
        "TIMEOUT",
        "The model took too long to respond. Try a shorter prompt.",
        { status: 504, retryable: true }
      )
    }
    throw new GenerationError(
      "MODEL_UNAVAILABLE",
      "The model is unavailable right now. Try again in a moment.",
      { status: 503, retryable: true }
    )
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener("abort", onAbort)
  }
}

export function extractGeminiText(response: GeminiResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? []
  const text = parts
    .map((part) => part.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim()

  if (!text) {
    const reason = response.candidates?.[0]?.finishReason
    if (reason === "SAFETY") {
      throw new GenerationError(
        "MODEL_REFUSED",
        "The model declined that request. Rephrase the prompt and try again.",
        { status: 422, retryable: false }
      )
    }
    throw new GenerationError(
      "MODEL_UNAVAILABLE",
      "The model returned an empty response.",
      { status: 502, retryable: true }
    )
  }

  return text
}

export function extractGeminiImages(response: GeminiResponse): GeminiInlineImage[] {
  const parts = response.candidates?.[0]?.content?.parts ?? []
  const images: GeminiInlineImage[] = []

  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data
    const mimeType = inline?.mimeType ?? inline?.mime_type
    const data = inline?.data
    if (mimeType?.startsWith("image/") && data) {
      images.push({ mimeType, data })
    }
  }

  return images
}

export async function generateGeminiImage(options: {
  prompt: string
  aspectRatio?: "auto" | "square" | "portrait" | "landscape"
  signal?: AbortSignal
}): Promise<GeminiInlineImage> {
  const aspectHint =
    options.aspectRatio && options.aspectRatio !== "auto"
      ? ` Use a ${options.aspectRatio} composition.`
      : ""

  let lastError: GenerationError | null = null

  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const response = await generateGeminiContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${options.prompt}${aspectHint}`,
              },
            ],
          },
        ],
        systemInstruction:
          "Create one clean scientific illustration suitable for a journal figure. No watermark, no logo, no decorative UI chrome, and no unreadable microtext.",
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.6,
        timeoutMs: 55_000,
        signal: options.signal,
      })

      const images = extractGeminiImages(response)
      if (images[0]) return images[0]

      lastError = new GenerationError(
        "MODEL_UNAVAILABLE",
        "The image model did not return an image.",
        { status: 502, retryable: true }
      )
    } catch (error) {
      lastError =
        error instanceof GenerationError
          ? error
          : new GenerationError(
              "MODEL_UNAVAILABLE",
              "The image model is unavailable right now.",
              { status: 503, retryable: true }
            )
      if (lastError.code === "MODEL_REFUSED" || lastError.code === "VALIDATION_ERROR") {
        throw lastError
      }
    }
  }

  throw (
    lastError ??
    new GenerationError(
      "MODEL_UNAVAILABLE",
      "No Gemini image model is available for this server.",
      { status: 503, retryable: true }
    )
  )
}
