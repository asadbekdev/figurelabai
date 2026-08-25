import { afterEach, describe, expect, it } from "vitest"

import { resolveModelProvider } from "../../lib/generation/resolve-provider"

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("resolveModelProvider", () => {
  it("honors an explicit fixture choice without any env", () => {
    delete process.env.MODEL_PROVIDER
    delete process.env.GEMINI_API_KEY
    expect(resolveModelProvider("fixture").id).toBe("fixture")
  })

  it("honors an explicit gemini choice when a key exists", () => {
    process.env.GEMINI_API_KEY = "test-key"
    expect(resolveModelProvider("gemini").id).toBe("gemini")
  })

  it("falls back to fixture when Gemini is requested without a key", () => {
    delete process.env.MODEL_PROVIDER
    delete process.env.GEMINI_API_KEY
    expect(resolveModelProvider("gemini").id).toBe("fixture")
  })

  it("falls back to the server environment when no choice is made", () => {
    delete process.env.MODEL_PROVIDER
    delete process.env.GEMINI_API_KEY
    expect(resolveModelProvider().id).toBe("fixture")

    process.env.GEMINI_API_KEY = "test-key"
    expect(resolveModelProvider().id).toBe("gemini")
  })
})
