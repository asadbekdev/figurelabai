import { apiError } from "../api/envelope"

export function configuredPublicApiKey(): string | null {
  const value = process.env.FIGURELAB_API_KEY?.trim()
  return value ? value : null
}

export function readPublicApiKey(request: Request): string | null {
  const header = request.headers.get("x-api-key")?.trim()
  if (header) return header
  const authorization = request.headers.get("authorization")
  if (authorization && /^bearer\s+/i.test(authorization)) {
    const token = authorization.replace(/^bearer\s+/i, "").trim()
    return token || null
  }
  return null
}

export function authorizePublicApi(
  request: Request,
  expected = configuredPublicApiKey()
): Response | null {
  if (!expected) return null
  const provided = readPublicApiKey(request)
  if (provided && provided === expected) return null
  return apiError(401, {
    code: "UNAUTHORIZED",
    message:
      "This server has FIGURELAB_API_KEY set. Send the same value as X-Api-Key or Authorization: Bearer.",
    retryable: false,
  })
}
