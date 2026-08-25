import { figurePlanSchema, type FigurePlan } from "@/lib/generation/contracts"
import type { GenerationJobType } from "@/lib/jobs/types"

const THREAD_KEY = "figurelab-generation-thread"
const REVISION_KEY = "figurelab-revision-job"
const SEED_KEY = "figurelab-composer-seed"
const THREAD_EVENT = "figurelab-generation-thread"
const SEED_EVENT = "figurelab-composer-seed"
const REVISION_EVENT = "figurelab-revision-job"

export type ComposerSeed = {
  prompt: string
  mode: "illustration" | "flowchart" | "plot"
}

export type GenerationThreadSnapshot = {
  prompt: string
  plan: FigurePlan | null
  jobId: string | null
  jobType?: GenerationJobType
  variantJobIds?: string[]
  idempotencyKey: string | null
  phase: "idle" | "planning" | "review" | "generating"
}

export const EMPTY_GENERATION_THREAD: GenerationThreadSnapshot = {
  prompt: "",
  plan: null,
  jobId: null,
  jobType: "initial_generation",
  variantJobIds: [],
  idempotencyKey: null,
  phase: "idle",
}

let cachedThreadRaw: string | null | undefined
let cachedThread: GenerationThreadSnapshot = EMPTY_GENERATION_THREAD
let cachedSeedRaw: string | null | undefined
let cachedSeed: ComposerSeed | null = null

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined"
}

function subscribe(event: string) {
  return (onStoreChange: () => void) => {
    if (typeof window === "undefined") return () => undefined
    window.addEventListener(event, onStoreChange)
    return () => window.removeEventListener(event, onStoreChange)
  }
}

function emit(event: string) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return
  window.dispatchEvent(new Event(event))
}

export const subscribeGenerationThread = subscribe(THREAD_EVENT)
export const subscribeComposerSeed = subscribe(SEED_EVENT)
export const subscribeRevisionJob = subscribe(REVISION_EVENT)

export function writeComposerSeed(seed: ComposerSeed): void {
  if (!canUseStorage()) return
  sessionStorage.setItem(SEED_KEY, JSON.stringify(seed))
  cachedSeedRaw = undefined
  emit(SEED_EVENT)
}

export function readComposerSeed(): ComposerSeed | null {
  if (!canUseStorage()) return null
  try {
    const raw = sessionStorage.getItem(SEED_KEY)
    if (raw === cachedSeedRaw) return cachedSeed
    cachedSeedRaw = raw
    if (!raw) {
      cachedSeed = null
      return null
    }
    const parsed = JSON.parse(raw) as Partial<ComposerSeed>
    if (typeof parsed.prompt !== "string" || !parsed.prompt.trim()) {
      cachedSeed = null
      return null
    }
    if (parsed.mode !== "illustration" && parsed.mode !== "flowchart" && parsed.mode !== "plot") {
      cachedSeed = null
      return null
    }
    cachedSeed = { prompt: parsed.prompt, mode: parsed.mode }
    return cachedSeed
  } catch {
    cachedSeed = null
    return null
  }
}

export function clearComposerSeed(): void {
  if (!canUseStorage()) return
  sessionStorage.removeItem(SEED_KEY)
  cachedSeedRaw = null
  cachedSeed = null
  emit(SEED_EVENT)
}

export function readGenerationThread(): GenerationThreadSnapshot {
  if (!canUseStorage()) return EMPTY_GENERATION_THREAD
  try {
    const raw = sessionStorage.getItem(THREAD_KEY)
    if (raw === cachedThreadRaw) return cachedThread
    cachedThreadRaw = raw
    if (!raw) {
      cachedThread = EMPTY_GENERATION_THREAD
      return cachedThread
    }
    const parsed = JSON.parse(raw) as Partial<GenerationThreadSnapshot>
    const jobId = typeof parsed.jobId === "string" ? parsed.jobId : null
    const variantJobIds = Array.isArray(parsed.variantJobIds)
      ? parsed.variantJobIds.filter((id): id is string => typeof id === "string").slice(0, 4)
      : []

    const planResult = figurePlanSchema.safeParse(parsed.plan)
    const plan = planResult.success ? planResult.data : null

    cachedThread = {
      prompt: typeof parsed.prompt === "string" ? parsed.prompt : "",
      plan,
      jobId,
      variantJobIds,
      jobType:
        parsed.jobType === "illustration" ||
        parsed.jobType === "illustration_revision" ||
        parsed.jobType === "plot" ||
        parsed.jobType === "revision" ||
        parsed.jobType === "initial_generation"
          ? parsed.jobType
          : "initial_generation",
      idempotencyKey:
        typeof parsed.idempotencyKey === "string" ? parsed.idempotencyKey : null,
      // Planning is an in-flight HTTP request, not a durable job. If the page
      // reloads while it is running, resume with an editable prompt instead of
      // restoring a spinner that can never settle.
      phase:
        parsed.phase === "review" && plan
          ? "review"
          : parsed.phase === "generating" && (Boolean(jobId) || variantJobIds.length > 0)
            ? "generating"
            : "idle",
    }
    return cachedThread
  } catch {
    cachedThread = EMPTY_GENERATION_THREAD
    return cachedThread
  }
}

export function writeGenerationThread(snapshot: GenerationThreadSnapshot): void {
  if (!canUseStorage()) return
  sessionStorage.setItem(THREAD_KEY, JSON.stringify(snapshot))
  cachedThreadRaw = undefined
  emit(THREAD_EVENT)
}

export function clearGenerationThread(): void {
  if (!canUseStorage()) return
  sessionStorage.removeItem(THREAD_KEY)
  cachedThreadRaw = null
  cachedThread = EMPTY_GENERATION_THREAD
  emit(THREAD_EVENT)
}

export function readRevisionJobId(projectId: string): string | null {
  if (!canUseStorage()) return null
  return sessionStorage.getItem(`${REVISION_KEY}:${projectId}`)
}

export function writeRevisionJobId(projectId: string, jobId: string | null): void {
  if (!canUseStorage()) return
  const key = `${REVISION_KEY}:${projectId}`
  if (jobId) sessionStorage.setItem(key, jobId)
  else sessionStorage.removeItem(key)
  emit(REVISION_EVENT)
}

export function wasJobConsumed(jobId: string): boolean {
  if (!canUseStorage()) return false
  return sessionStorage.getItem(`figurelab-job-consumed:${jobId}`) === "1"
}

export function markJobConsumed(jobId: string): void {
  if (!canUseStorage()) return
  sessionStorage.setItem(`figurelab-job-consumed:${jobId}`, "1")
  emit(REVISION_EVENT)
}
