"use client"

import { useCallback, useState, useSyncExternalStore } from "react"

import {
  readRevisionJobId,
  subscribeRevisionJob,
  wasJobConsumed,
  writeRevisionJobId,
} from "./generation-thread"

export function usePersistedRevisionJobId(projectId: string | null) {
  const getSnapshot = useCallback(
    () => (projectId ? readRevisionJobId(projectId) : null),
    [projectId]
  )
  const persisted = useSyncExternalStore(subscribeRevisionJob, getSnapshot, () => null)
  const [override, setOverride] = useState<string | null | undefined>(undefined)
  const [seenProjectId, setSeenProjectId] = useState(projectId)
  if (seenProjectId !== projectId) {
    setSeenProjectId(projectId)
    setOverride(undefined)
  }

  const stored = persisted && !wasJobConsumed(persisted) ? persisted : null
  const jobId = override === undefined ? stored : override

  function setJobId(next: string | null) {
    setOverride(next)
    if (projectId) writeRevisionJobId(projectId, next)
  }

  return [jobId, setJobId] as const
}
