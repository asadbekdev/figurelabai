import { createFileShareStore, type ShareStore } from "./store"

const globalForShares = globalThis as typeof globalThis & {
  __figurelabShareStore?: ShareStore
}

export function getShareStore(): ShareStore {
  if (!globalForShares.__figurelabShareStore) {
    globalForShares.__figurelabShareStore = createFileShareStore()
  }
  return globalForShares.__figurelabShareStore
}
