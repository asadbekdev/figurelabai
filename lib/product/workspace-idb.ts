import {
  libraryFolderSchema,
  persistedDocumentSchema,
  projectRecordSchema,
  projectThreadSchema,
  projectVersionSchema,
  recoverySnapshotSchema,
  workspaceAssetSchema,
} from "./workspace-types"
import type {
  DocumentCommitInput,
  DocumentCommitResult,
  WorkspaceStorage,
} from "./workspace-storage"

const DB_NAME = "figurelab-workspace"
const DB_VERSION = 3
const DB_OPEN_TIMEOUT_MS = 4_000

type StoreName =
  | "projects"
  | "documents"
  | "versions"
  | "assets"
  | "threads"
  | "recovery"
  | "folders"

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    let settled = false
    const timeout = setTimeout(() => {
      finish(() => reject(new Error("Opening the local workspace timed out")))
    }, DB_OPEN_TIMEOUT_MS)
    const finish = (callback: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      callback()
    }
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("documents")) {
        const store = db.createObjectStore("documents", { keyPath: "id" })
        store.createIndex("projectId", "projectId", { unique: false })
      }
      if (!db.objectStoreNames.contains("versions")) {
        const store = db.createObjectStore("versions", { keyPath: "id" })
        store.createIndex("projectId", "projectId", { unique: false })
      }
      if (!db.objectStoreNames.contains("assets")) {
        db.createObjectStore("assets", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("recovery")) {
        db.createObjectStore("recovery", { keyPath: "projectId" })
      }
      if (!db.objectStoreNames.contains("threads")) {
        db.createObjectStore("threads", { keyPath: "projectId" })
      }
      if (!db.objectStoreNames.contains("folders")) {
        db.createObjectStore("folders", { keyPath: "id" })
      }
    }
    request.onsuccess = () => {
      if (settled) {
        request.result.close()
        return
      }
      const database = request.result
      database.onversionchange = () => database.close()
      finish(() => resolve(database))
    }
    request.onblocked = () => {
      finish(() => reject(new Error("The local workspace is blocked by another tab")))
    }
    request.onerror = () => {
      finish(() => reject(request.error ?? new Error("IndexedDB could not open")))
    }
  })
}

export async function createIndexedDbStorage(): Promise<WorkspaceStorage> {
  const db = await openDatabase()

  function store(name: StoreName, mode: IDBTransactionMode = "readonly") {
    return db.transaction(name, mode).objectStore(name)
  }

  return {
    async listProjects() {
      const rows = await requestToPromise(store("projects").getAll())
      return rows.map((row) => projectRecordSchema.parse(row))
    },
    async getProject(id) {
      const row = await requestToPromise(store("projects").get(id))
      return row ? projectRecordSchema.parse(row) : null
    },
    async putProject(project) {
      const next = projectRecordSchema.parse(project)
      const transaction = db.transaction("projects", "readwrite")
      transaction.objectStore("projects").put(next)
      await transactionDone(transaction)
    },
    async getDocument(id) {
      const row = await requestToPromise(store("documents").get(id))
      return row ? persistedDocumentSchema.parse(row) : null
    },
    async listDocuments(projectId) {
      const index = store("documents").index("projectId")
      const rows = await requestToPromise(index.getAll(projectId))
      return rows.map((row) => persistedDocumentSchema.parse(row))
    },
    async putDocument(document) {
      const next = persistedDocumentSchema.parse(document)
      const transaction = db.transaction("documents", "readwrite")
      transaction.objectStore("documents").put(next)
      await transactionDone(transaction)
    },
    async deleteDocuments(ids) {
      if (ids.length === 0) return
      const transaction = db.transaction("documents", "readwrite")
      const objectStore = transaction.objectStore("documents")
      for (const id of ids) objectStore.delete(id)
      await transactionDone(transaction)
    },
    async commitDocument(input: DocumentCommitInput): Promise<DocumentCommitResult> {
      const transaction = db.transaction(["projects", "documents", "recovery"], "readwrite")
      const projectStore = transaction.objectStore("projects")
      const documentStore = transaction.objectStore("documents")
      const recoveryStore = transaction.objectStore("recovery")

      const project = await requestToPromise(projectStore.get(input.projectId))
      if (!project) {
        throw new Error(`Unknown project: ${input.projectId}`)
      }

      const current = project.currentDocumentId
        ? await requestToPromise(documentStore.get(project.currentDocumentId))
        : null

      if (current && current.revision !== input.baseRevision) {
        return {
          ok: false,
          code: "DOCUMENT_CONFLICT",
          stored: persistedDocumentSchema.parse(current),
        }
      }

      const next = persistedDocumentSchema.parse(input.next)
      const updated = projectRecordSchema.parse({
        ...project,
        ...input.projectPatch,
        currentDocumentId: next.id,
      })
      documentStore.put(next)
      projectStore.put(updated)
      recoveryStore.delete(input.projectId)
      await transactionDone(transaction)
      return { ok: true, project: updated, document: next }
    },
    async listVersions(projectId) {
      const index = store("versions").index("projectId")
      const rows = await requestToPromise(index.getAll(projectId))
      return rows.map((row) => projectVersionSchema.parse(row))
    },
    async putVersion(version) {
      const next = projectVersionSchema.parse(version)
      const transaction = db.transaction("versions", "readwrite")
      transaction.objectStore("versions").put(next)
      await transactionDone(transaction)
    },
    async listAssets() {
      const rows = await requestToPromise(store("assets").getAll())
      return rows.map((row) => workspaceAssetSchema.parse(row))
    },
    async putAsset(asset) {
      const next = workspaceAssetSchema.parse(asset)
      const transaction = db.transaction("assets", "readwrite")
      transaction.objectStore("assets").put(next)
      await transactionDone(transaction)
    },
    async getAsset(id) {
      const row = await requestToPromise(store("assets").get(id))
      return row ? workspaceAssetSchema.parse(row) : null
    },
    async listFolders() {
      const rows = await requestToPromise(store("folders").getAll())
      return rows.map((row) => libraryFolderSchema.parse(row))
    },
    async putFolder(folder) {
      const next = libraryFolderSchema.parse(folder)
      const transaction = db.transaction("folders", "readwrite")
      transaction.objectStore("folders").put(next)
      await transactionDone(transaction)
    },
    async deleteFolder(id) {
      const transaction = db.transaction("folders", "readwrite")
      transaction.objectStore("folders").delete(id)
      await transactionDone(transaction)
    },
    async getThread(projectId) {
      const row = await requestToPromise(store("threads").get(projectId))
      return row ? projectThreadSchema.parse(row) : null
    },
    async putThread(thread) {
      const next = projectThreadSchema.parse(thread)
      const transaction = db.transaction("threads", "readwrite")
      transaction.objectStore("threads").put(next)
      await transactionDone(transaction)
    },
    async getRecovery(projectId) {
      const row = await requestToPromise(store("recovery").get(projectId))
      return row ? recoverySnapshotSchema.parse(row) : null
    },
    async putRecovery(snapshot) {
      const next = recoverySnapshotSchema.parse(snapshot)
      const transaction = db.transaction("recovery", "readwrite")
      transaction.objectStore("recovery").put(next)
      await transactionDone(transaction)
    },
    async deleteRecovery(projectId) {
      const transaction = db.transaction("recovery", "readwrite")
      transaction.objectStore("recovery").delete(projectId)
      await transactionDone(transaction)
    },
  }
}
