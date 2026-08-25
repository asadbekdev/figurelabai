import {
  libraryFolderSchema,
  persistedDocumentSchema,
  projectRecordSchema,
  projectThreadSchema,
  projectVersionSchema,
  recoverySnapshotSchema,
  workspaceAssetSchema,
  type LibraryFolder,
  type PersistedDocument,
  type ProjectRecord,
  type ProjectThread,
  type ProjectVersionRecord,
  type RecoverySnapshot,
  type WorkspaceAsset,
} from "./workspace-types"

export type DocumentCommitInput = {
  projectId: string
  baseRevision: number
  next: PersistedDocument
  projectPatch: Partial<ProjectRecord>
}

export type DocumentCommitResult =
  | { ok: true; project: ProjectRecord; document: PersistedDocument }
  | { ok: false; code: "DOCUMENT_CONFLICT"; stored: PersistedDocument }

export interface WorkspaceStorage {
  listProjects(): Promise<ProjectRecord[]>
  getProject(id: string): Promise<ProjectRecord | null>
  putProject(project: ProjectRecord): Promise<void>
  getDocument(id: string): Promise<PersistedDocument | null>
  listDocuments(projectId: string): Promise<PersistedDocument[]>
  putDocument(document: PersistedDocument): Promise<void>
  deleteDocuments(ids: string[]): Promise<void>
  commitDocument(input: DocumentCommitInput): Promise<DocumentCommitResult>
  listVersions(projectId: string): Promise<ProjectVersionRecord[]>
  putVersion(version: ProjectVersionRecord): Promise<void>
  listAssets(): Promise<WorkspaceAsset[]>
  putAsset(asset: WorkspaceAsset): Promise<void>
  getAsset(id: string): Promise<WorkspaceAsset | null>
  listFolders(): Promise<LibraryFolder[]>
  putFolder(folder: LibraryFolder): Promise<void>
  deleteFolder(id: string): Promise<void>
  getThread(projectId: string): Promise<ProjectThread | null>
  putThread(thread: ProjectThread): Promise<void>
  getRecovery(projectId: string): Promise<RecoverySnapshot | null>
  putRecovery(snapshot: RecoverySnapshot): Promise<void>
  deleteRecovery(projectId: string): Promise<void>
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function createMemoryStorage(
  seed?: {
    projects?: ProjectRecord[]
    documents?: PersistedDocument[]
    versions?: ProjectVersionRecord[]
    assets?: WorkspaceAsset[]
    threads?: ProjectThread[]
    recovery?: RecoverySnapshot[]
    folders?: LibraryFolder[]
  }
): WorkspaceStorage {
  const projects = new Map((seed?.projects ?? []).map((item) => [item.id, clone(item)]))
  const documents = new Map((seed?.documents ?? []).map((item) => [item.id, clone(item)]))
  const versions = new Map((seed?.versions ?? []).map((item) => [item.id, clone(item)]))
  const assets = new Map((seed?.assets ?? []).map((item) => [item.id, clone(item)]))
  const threads = new Map((seed?.threads ?? []).map((item) => [item.projectId, clone(item)]))
  const recovery = new Map((seed?.recovery ?? []).map((item) => [item.projectId, clone(item)]))
  const folders = new Map((seed?.folders ?? []).map((item) => [item.id, clone(item)]))

  return {
    async listProjects() {
      return [...projects.values()].map(clone)
    },
    async getProject(id) {
      const project = projects.get(id)
      return project ? clone(project) : null
    },
    async putProject(project) {
      projects.set(project.id, projectRecordSchema.parse(clone(project)))
    },
    async getDocument(id) {
      const document = documents.get(id)
      return document ? clone(document) : null
    },
    async listDocuments(projectId) {
      return [...documents.values()]
        .filter((document) => document.projectId === projectId)
        .map(clone)
    },
    async putDocument(document) {
      documents.set(document.id, persistedDocumentSchema.parse(clone(document)))
    },
    async deleteDocuments(ids) {
      for (const id of ids) documents.delete(id)
    },
    async commitDocument(input) {
      const project = projects.get(input.projectId)
      if (!project) {
        throw new Error(`Unknown project: ${input.projectId}`)
      }

      const current = project.currentDocumentId
        ? documents.get(project.currentDocumentId) ?? null
        : null

      if (current && current.revision !== input.baseRevision) {
        return { ok: false, code: "DOCUMENT_CONFLICT", stored: clone(current) }
      }

      const next = persistedDocumentSchema.parse(clone(input.next))
      documents.set(next.id, next)
      const updated = projectRecordSchema.parse({
        ...project,
        ...input.projectPatch,
        currentDocumentId: next.id,
      })
      projects.set(updated.id, updated)
      recovery.delete(input.projectId)
      return { ok: true, project: clone(updated), document: clone(next) }
    },
    async listVersions(projectId) {
      return [...versions.values()]
        .filter((version) => version.projectId === projectId)
        .map(clone)
    },
    async putVersion(version) {
      versions.set(version.id, projectVersionSchema.parse(clone(version)))
    },
    async listAssets() {
      return [...assets.values()].map(clone)
    },
    async putAsset(asset) {
      assets.set(asset.id, workspaceAssetSchema.parse(clone(asset)))
    },
    async getAsset(id) {
      const asset = assets.get(id)
      return asset ? clone(asset) : null
    },
    async listFolders() {
      return [...folders.values()].map(clone)
    },
    async putFolder(folder) {
      folders.set(folder.id, libraryFolderSchema.parse(clone(folder)))
    },
    async deleteFolder(id) {
      folders.delete(id)
    },
    async getThread(projectId) {
      const thread = threads.get(projectId)
      return thread ? clone(thread) : null
    },
    async putThread(thread) {
      threads.set(thread.projectId, projectThreadSchema.parse(clone(thread)))
    },
    async getRecovery(projectId) {
      const snapshot = recovery.get(projectId)
      return snapshot ? clone(snapshot) : null
    },
    async putRecovery(snapshot) {
      recovery.set(snapshot.projectId, recoverySnapshotSchema.parse(clone(snapshot)))
    },
    async deleteRecovery(projectId) {
      recovery.delete(projectId)
    },
  }
}
