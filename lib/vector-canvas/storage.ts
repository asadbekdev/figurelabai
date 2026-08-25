import { parseVectorDocument, vectorDocumentSchema, type VectorDocument } from "./schema"

export type VectorCanvasStorage = {
  list(): Promise<VectorDocument[]>
  get(id: string): Promise<VectorDocument | null>
  put(document: VectorDocument): Promise<VectorDocument>
  remove(id: string): Promise<boolean>
}

export function createMemoryVectorStorage(seed: VectorDocument[] = []): VectorCanvasStorage {
  const records = new Map(seed.map((document) => [document.id, parseVectorDocument(document)]))

  return {
    async list() {
      return [...records.values()].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      )
    },
    async get(id) {
      return records.get(id) ?? null
    },
    async put(document) {
      const next = parseVectorDocument(document)
      records.set(next.id, next)
      return next
    },
    async remove(id) {
      return records.delete(id)
    },
  }
}

const DB_NAME = "figurelab-vector-canvas"
const DB_VERSION = 1
const STORE_NAME = "documents"

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB could not open"))
  })
}

export async function createIndexedDbVectorStorage(): Promise<VectorCanvasStorage> {
  const db = await openDatabase()

  return {
    async list() {
      const rows = await requestToPromise(
        db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll()
      )
      return rows
        .flatMap((row) => {
          const parsed = vectorDocumentSchema.safeParse(row)
          return parsed.success ? [parsed.data] : []
        })
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    },
    async get(id) {
      const row = await requestToPromise(
        db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id)
      )
      if (!row) return null
      try {
        return parseVectorDocument(row)
      } catch {
        return null
      }
    },
    async put(document) {
      const next = parseVectorDocument(document)
      await requestToPromise(
        db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(next)
      )
      return next
    },
    async remove(id) {
      const current = await requestToPromise(
        db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id)
      )
      if (!current) return false
      await requestToPromise(
        db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id)
      )
      return true
    },
  }
}
