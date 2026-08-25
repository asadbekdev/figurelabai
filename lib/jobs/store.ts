import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { generationJobSchema, type GenerationJob } from "./types"

const MAX_JOBS = 200

export type JobStore = {
  get(id: string): Promise<GenerationJob | null>
  getByIdempotencyKey(key: string): Promise<GenerationJob | null>
  put(job: GenerationJob): Promise<GenerationJob>
  list(): Promise<GenerationJob[]>
}

function nowIso(): string {
  return new Date().toISOString()
}

function prune(jobs: Map<string, GenerationJob>) {
  if (jobs.size <= MAX_JOBS) return
  const ranked = [...jobs.values()].sort((left, right) =>
    left.updatedAt.localeCompare(right.updatedAt)
  )
  const extra = ranked.length - MAX_JOBS
  for (const job of ranked.slice(0, extra)) {
    if (job.status === "queued" || job.status === "running") continue
    jobs.delete(job.id)
  }
}

export function createMemoryJobStore(seed: GenerationJob[] = []): JobStore {
  const jobs = new Map(seed.map((job) => [job.id, job]))

  return {
    async get(id) {
      return jobs.get(id) ?? null
    },
    async getByIdempotencyKey(key) {
      return [...jobs.values()].find((job) => job.idempotencyKey === key) ?? null
    },
    async put(job) {
      const next = generationJobSchema.parse({ ...job, updatedAt: nowIso() })
      jobs.set(next.id, next)
      prune(jobs)
      return next
    },
    async list() {
      return [...jobs.values()]
    },
  }
}

export function createFileJobStore(filePath = join(process.cwd(), ".data", "generation-jobs.json")): JobStore {
  const memory = createMemoryJobStore(readPersistedJobs(filePath))

  async function persist() {
    try {
      mkdirSync(dirname(filePath), { recursive: true })
      const rows = await memory.list()
      const tmp = `${filePath}.tmp`
      writeFileSync(tmp, JSON.stringify(rows))
      renameSync(tmp, filePath)
    } catch {
      // Local durability only. A read-only host still keeps jobs in memory.
    }
  }

  return {
    get: memory.get,
    getByIdempotencyKey: memory.getByIdempotencyKey,
    list: memory.list,
    async put(job) {
      const next = await memory.put(job)
      await persist()
      return next
    },
  }
}

function readPersistedJobs(filePath: string): GenerationJob[] {
  try {
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown
    if (!Array.isArray(raw)) return []
    return raw.flatMap((row) => {
      const parsed = generationJobSchema.safeParse(row)
      return parsed.success ? [parsed.data] : []
    })
  } catch {
    return []
  }
}
