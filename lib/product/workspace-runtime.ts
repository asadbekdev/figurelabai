import { createIndexedDbStorage } from "./workspace-idb"
import { createWorkspaceRepository, type WorkspaceRepository } from "./workspace-repository"
import { createMemoryStorage } from "./workspace-storage"

let repositoryPromise: Promise<WorkspaceRepository> | null = null
let memoryFallback = false

export async function getWorkspaceRepository(): Promise<WorkspaceRepository> {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      if (typeof indexedDB === "undefined") {
        memoryFallback = true
        return createWorkspaceRepository(createMemoryStorage())
      }

      try {
        return createWorkspaceRepository(await createIndexedDbStorage())
      } catch {
        memoryFallback = true
        return createWorkspaceRepository(createMemoryStorage())
      }
    })()
  }

  return repositoryPromise
}

export function isMemoryWorkspace(): boolean {
  return memoryFallback
}
