import type { ModelProvider, ModelProviderId } from "./model-provider"
import { GeminiModelProvider } from "./provider"
import { FixtureModelProvider } from "./providers/fixture"

function requestedProvider(): ModelProviderId | null {
  const value = process.env.MODEL_PROVIDER?.trim().toLowerCase()
  if (value === "fixture" || value === "gemini") return value
  return null
}

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim())
}

export function resolveModelProvider(requested?: ModelProviderId | null): ModelProvider {
  if (requested === "fixture") return new FixtureModelProvider()
  if (requested === "gemini") {
    if (!hasGeminiKey()) return new FixtureModelProvider()
    return new GeminiModelProvider()
  }

  const fromEnv = requestedProvider()
  if (fromEnv === "fixture") return new FixtureModelProvider()
  if (fromEnv === "gemini") {
    if (!hasGeminiKey()) return new FixtureModelProvider()
    return new GeminiModelProvider()
  }
  if (hasGeminiKey()) return new GeminiModelProvider()
  return new FixtureModelProvider()
}

export function fixtureStageDelayMs(): number {
  const raw = process.env.FIXTURE_STAGE_DELAY_MS
  if (raw === undefined || raw === "") return 550
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 550
}
