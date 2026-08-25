import { afterEach, describe, expect, it, vi } from "vitest"

import { generateGeminiContent } from "../../lib/generation/gemini"

const ORIGINAL_API_KEY = process.env.GEMINI_API_KEY

function request(signal?: AbortSignal, timeoutMs = 50) {
  return generateGeminiContent({
    model: "gemini-test",
    contents: [{ role: "user", parts: [{ text: "Test request" }] }],
    timeoutMs,
    signal,
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  if (ORIGINAL_API_KEY === undefined) delete process.env.GEMINI_API_KEY
  else process.env.GEMINI_API_KEY = ORIGINAL_API_KEY
})

describe("Gemini request cancellation", () => {
  it("does not call the provider for a pre-aborted request", async () => {
    process.env.GEMINI_API_KEY = "test-key"
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const controller = new AbortController()
    controller.abort()

    await expect(request(controller.signal)).rejects.toMatchObject({
      code: "CANCELED",
      retryable: true,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("maps the internal deadline to a retryable timeout", async () => {
    vi.useFakeTimers()
    process.env.GEMINI_API_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Timed out", "AbortError")),
            { once: true }
          )
        })
      )
    )

    const pending = request(undefined, 25)
    const assertion = expect(pending).rejects.toMatchObject({
      code: "TIMEOUT",
      retryable: true,
    })
    await vi.advanceTimersByTimeAsync(25)
    await assertion
  })

  it("distinguishes caller cancellation from an internal timeout", async () => {
    process.env.GEMINI_API_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Canceled", "AbortError")),
            { once: true }
          )
        })
      )
    )
    const controller = new AbortController()
    const pending = request(controller.signal)

    controller.abort()
    await expect(pending).rejects.toMatchObject({ code: "CANCELED", retryable: true })
  })
})
