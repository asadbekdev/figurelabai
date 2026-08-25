export type ProjectSaveQueue = {
  flush: () => Promise<void>
}

/**
 * Coalesces overlapping save requests while ensuring every caller waits until
 * the latest queued save has finished. This keeps explicit flushes from
 * returning while an older autosave is still in flight.
 */
export function createProjectSaveQueue(save: () => Promise<void>): ProjectSaveQueue {
  let active: Promise<void> | null = null
  let queued = false

  const flush = (): Promise<void> => {
    if (active) {
      queued = true
      return active
    }

    const run = async () => {
      do {
        queued = false
        await save()
      } while (queued)
    }

    const operation = run().finally(() => {
      if (active === operation) active = null
    })
    active = operation
    return operation
  }

  return { flush }
}
