import { fixtureStageDelayMs, resolveModelProvider } from "../generation/resolve-provider"

import { createJobRunner, resumeOrphanedJobs, type JobRunner } from "./runner"
import { createFileJobStore } from "./store"

const globalForJobs = globalThis as typeof globalThis & {
  __figurelabJobRunner?: JobRunner
}

export function getJobRunner(): JobRunner {
  if (!globalForJobs.__figurelabJobRunner) {
    const store = createFileJobStore(process.env.FIGURELAB_JOB_STORE_PATH?.trim() || undefined)
    const runner = createJobRunner({
      store,
      provider: resolveModelProvider(),
      stageDelayMs: fixtureStageDelayMs(),
    })
    globalForJobs.__figurelabJobRunner = runner
    void store.list().then((jobs) => resumeOrphanedJobs(runner, jobs))
  }
  return globalForJobs.__figurelabJobRunner
}
