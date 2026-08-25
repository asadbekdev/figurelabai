import { demoFlowchartDocument } from "@/lib/flowchart/fixture"
import { runFlowchartReadiness } from "@/lib/flowchart/readiness"
import type { FlowchartDocument } from "@/lib/flowchart/schema"

import { checksumDocument } from "./workspace-checksum"
import type { WorkspaceStorage } from "./workspace-storage"
import {
  createEntityId,
  nowIso,
  parseWorkspaceDocument,
  type DocumentSource,
  type FigureMode,
  type LibraryFolder,
  type OpenedProject,
  type PersistedDocument,
  type ProjectMessage,
  type ProjectRecord,
  type ProjectThread,
  type ProjectStatus,
  type ProjectVersionRecord,
  type RecoverySnapshot,
  type SaveDocumentResult,
  type WorkspaceAsset,
  type WorkspaceDocument,
} from "./workspace-types"

const AUTOSAVE_KEEP = 20

function statusForDocument(
  document: WorkspaceDocument | null,
  hasAsset = false
): ProjectStatus {
  if (!document) return hasAsset ? "ready" : "draft"
  if (document.kind === "flowchart") {
    return runFlowchartReadiness(document).ready ? "ready" : "draft"
  }
  return "ready"
}

export type CreateProjectInput = {
  id?: string
  title: string
  mode: FigureMode
  document?: WorkspaceDocument
  source?: DocumentSource
  currentAssetId?: string | null
  thread?: Omit<ProjectThread, "projectId" | "updatedAt">
}

function cloneWorkspaceDocument(document: WorkspaceDocument): WorkspaceDocument {
  return parseWorkspaceDocument(JSON.parse(JSON.stringify(document)))
}

export function createWorkspaceRepository(storage: WorkspaceStorage) {
  async function pruneAutosaves(projectId: string) {
    const [documents, versions] = await Promise.all([
      storage.listDocuments(projectId),
      storage.listVersions(projectId),
    ])
    const project = await storage.getProject(projectId)
    const keep = new Set<string>()
    if (project?.currentDocumentId) keep.add(project.currentDocumentId)
    for (const version of versions) keep.add(version.documentId)

    const autosaves = documents
      .filter((document) => document.source === "autosave" && !keep.has(document.id))
      .sort((left, right) => right.revision - left.revision)

    const stale = autosaves.slice(AUTOSAVE_KEEP).map((document) => document.id)
    if (stale.length > 0) await storage.deleteDocuments(stale)
  }

  const repository = {
    async listProjects(includeArchived = false): Promise<ProjectRecord[]> {
      const projects = await storage.listProjects()
      return projects
        .filter((project) => includeArchived || project.status !== "archived")
        .sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt))
    },

    async listAssets(): Promise<WorkspaceAsset[]> {
      const assets = await storage.listAssets()
      return assets.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    },

    async ensureDemoProject(): Promise<ProjectRecord> {
      const existing = await storage.getProject("demo")
      if (existing) return existing

      const created = await repository.createProject({
        id: "demo",
        title: demoFlowchartDocument.metadata.title,
        mode: "flowchart",
        document: demoFlowchartDocument,
        source: "migration",
      })
      await repository.nameVersion(created.project.id, "Generated layout")
      return created.project
    },

    async createProject(input: CreateProjectInput): Promise<{
      project: ProjectRecord
      document: PersistedDocument | null
    }> {
      const timestamp = nowIso()
      const projectId = input.id ?? createEntityId()
      const content = input.document ? parseWorkspaceDocument(input.document) : null
      const persisted: PersistedDocument | null = content
        ? {
            id: createEntityId(),
            projectId,
            schemaVersion: 1,
            revision: 1,
            content: cloneWorkspaceDocument(content),
            source: input.source ?? "autosave",
            parentDocumentId: null,
            checksum: checksumDocument(content),
            createdAt: timestamp,
          }
        : null

      const project: ProjectRecord = {
        id: projectId,
        title: input.title,
        mode: input.mode,
        status: statusForDocument(content, Boolean(input.currentAssetId)),
        currentDocumentId: persisted?.id ?? null,
        currentAssetId: input.currentAssetId ?? null,
        lastOpenedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      await storage.putProject(project)
      if (persisted) await storage.putDocument(persisted)
      if (input.thread) {
        await storage.putThread({
          projectId,
          prompt: input.thread.prompt,
          plan: input.thread.plan,
          messages: input.thread.messages,
          updatedAt: timestamp,
        })
      }
      return { project, document: persisted }
    },

    async openProject(projectId: string): Promise<OpenedProject | null> {
      const project = await storage.getProject(projectId)
      if (!project || project.status === "archived") return null

      const timestamp = nowIso()
      const opened: ProjectRecord = {
        ...project,
        lastOpenedAt: timestamp,
        updatedAt: timestamp,
      }
      await storage.putProject(opened)

      const document = opened.currentDocumentId
        ? await storage.getDocument(opened.currentDocumentId)
        : null
      if (opened.currentDocumentId && !document) {
        throw new Error("The current project document is missing from local storage.")
      }
      const versions = (await storage.listVersions(projectId)).sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      )
      const recovery = await storage.getRecovery(projectId)
      const thread = await storage.getThread(projectId)
      const asset = opened.currentAssetId
        ? await storage.getAsset(opened.currentAssetId)
        : null

      return { project: opened, document, versions, recovery, thread, asset }
    },

    async getProject(projectId: string): Promise<ProjectRecord | null> {
      return storage.getProject(projectId)
    },

    async renameProject(projectId: string, title: string): Promise<ProjectRecord> {
      const project = await storage.getProject(projectId)
      if (!project) throw new Error(`Unknown project: ${projectId}`)
      const next: ProjectRecord = {
        ...project,
        title: title.trim() || project.title,
        updatedAt: nowIso(),
      }
      await storage.putProject(next)
      return next
    },

    async archiveProject(projectId: string): Promise<ProjectRecord> {
      if (projectId === "demo") {
        throw new Error("The demo project cannot be archived.")
      }
      const project = await storage.getProject(projectId)
      if (!project) throw new Error(`Unknown project: ${projectId}`)
      const next: ProjectRecord = {
        ...project,
        status: "archived",
        updatedAt: nowIso(),
      }
      await storage.putProject(next)
      return next
    },

    async saveDocument(
      projectId: string,
      document: WorkspaceDocument,
      baseRevision: number,
      source: DocumentSource = "autosave"
    ): Promise<SaveDocumentResult> {
      const project = await storage.getProject(projectId)
      if (!project) throw new Error(`Unknown project: ${projectId}`)

      const content = parseWorkspaceDocument(document)
      const current = project.currentDocumentId
        ? await storage.getDocument(project.currentDocumentId)
        : null
      const next: PersistedDocument = {
        id: createEntityId(),
        projectId,
        schemaVersion: 1,
        revision: (current?.revision ?? 0) + 1,
        content: cloneWorkspaceDocument(content),
        source,
        parentDocumentId: current?.id ?? null,
        checksum: checksumDocument(content),
        createdAt: nowIso(),
      }

      const committed = await storage.commitDocument({
        projectId,
        baseRevision,
        next,
        projectPatch: {
          title: content.metadata.title || project.title,
          status: statusForDocument(content),
          updatedAt: next.createdAt,
          lastOpenedAt: next.createdAt,
        },
      })

      if (!committed.ok) {
        return {
          ok: false,
          conflict: {
            code: "DOCUMENT_CONFLICT",
            stored: committed.stored,
            local: content,
            localBaseRevision: baseRevision,
          },
        }
      }

      await pruneAutosaves(projectId)
      return {
        ok: true,
        revision: committed.document.revision,
        documentId: committed.document.id,
        checksum: committed.document.checksum,
        savedAt: committed.document.createdAt,
      }
    },

    async writeRecovery(snapshot: RecoverySnapshot): Promise<void> {
      await storage.putRecovery(snapshot)
    },

    async discardRecovery(projectId: string): Promise<void> {
      await storage.deleteRecovery(projectId)
    },

    async listVersions(projectId: string): Promise<ProjectVersionRecord[]> {
      const versions = await storage.listVersions(projectId)
      return versions.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    },

    async nameVersion(
      projectId: string,
      name: string,
      description?: string
    ): Promise<ProjectVersionRecord> {
      const project = await storage.getProject(projectId)
      if (!project?.currentDocumentId) {
        throw new Error("Name a version only after the document has been saved.")
      }

      const version: ProjectVersionRecord = {
        id: createEntityId(),
        projectId,
        documentId: project.currentDocumentId,
        name: name.trim() || "Named version",
        description,
        createdAt: nowIso(),
      }
      await storage.putVersion(version)
      return version
    },

    async restoreVersion(projectId: string, versionId: string): Promise<OpenedProject> {
      const versions = await storage.listVersions(projectId)
      const version = versions.find((item) => item.id === versionId)
      if (!version) throw new Error("That version is no longer available.")

      const source = await storage.getDocument(version.documentId)
      if (!source) throw new Error("The version document is missing.")

      const project = await storage.getProject(projectId)
      if (!project) throw new Error(`Unknown project: ${projectId}`)

      const saved = await repository.saveDocument(
        projectId,
        source.content,
        project.currentDocumentId
          ? ((await storage.getDocument(project.currentDocumentId))?.revision ?? 0)
          : 0,
        "restore"
      )

      if (!saved.ok) {
        throw new Error("The version could not be restored because the document changed.")
      }

      const opened = await repository.openProject(projectId)
      if (!opened) throw new Error("The restored project could not be opened.")
      return opened
    },

    async addAsset(
      asset: Omit<WorkspaceAsset, "id" | "createdAt" | "folderId" | "favorite"> & {
        id?: string
        createdAt?: string
        folderId?: string | null
        favorite?: boolean
      }
    ): Promise<WorkspaceAsset> {
      const next: WorkspaceAsset = {
        id: asset.id ?? createEntityId(),
        projectId: asset.projectId,
        kind: asset.kind,
        mimeType: asset.mimeType,
        dataUrl: asset.dataUrl,
        prompt: asset.prompt,
        folderId: asset.folderId ?? null,
        favorite: asset.favorite ?? false,
        createdAt: asset.createdAt ?? nowIso(),
      }
      await storage.putAsset(next)
      if (asset.projectId && asset.kind === "generated_asset") {
        const project = await storage.getProject(asset.projectId)
        if (project) {
          const currentDocument = project.currentDocumentId
            ? await storage.getDocument(project.currentDocumentId)
            : null
          await storage.putProject({
            ...project,
            currentAssetId: next.id,
            status: statusForDocument(currentDocument?.content ?? null, true),
            updatedAt: nowIso(),
          })
        }
      }
      return next
    },

    async listFolders(): Promise<LibraryFolder[]> {
      const folders = await storage.listFolders()
      return folders.sort((left, right) => left.name.localeCompare(right.name))
    },

    async createFolder(name: string): Promise<LibraryFolder> {
      const folder: LibraryFolder = {
        id: createEntityId(),
        name: name.trim().slice(0, 80) || "Untitled folder",
        createdAt: nowIso(),
      }
      await storage.putFolder(folder)
      return folder
    },

    async deleteFolder(folderId: string): Promise<void> {
      const assets = await storage.listAssets()
      for (const asset of assets) {
        if (asset.folderId === folderId) {
          await storage.putAsset({ ...asset, folderId: null })
        }
      }
      await storage.deleteFolder(folderId)
    },

    async setAssetFolder(assetId: string, folderId: string | null): Promise<WorkspaceAsset> {
      const asset = await storage.getAsset(assetId)
      if (!asset) throw new Error("That asset is no longer available.")
      if (folderId) {
        const folders = await storage.listFolders()
        if (!folders.some((folder) => folder.id === folderId)) {
          throw new Error("That folder is no longer available.")
        }
      }
      const next: WorkspaceAsset = { ...asset, folderId }
      await storage.putAsset(next)
      return next
    },

    async setAssetFavorite(assetId: string, favorite: boolean): Promise<WorkspaceAsset> {
      const asset = await storage.getAsset(assetId)
      if (!asset) throw new Error("That asset is no longer available.")
      const next: WorkspaceAsset = { ...asset, favorite }
      await storage.putAsset(next)
      return next
    },

    async getThread(projectId: string): Promise<ProjectThread | null> {
      return storage.getThread(projectId)
    },

    async saveThread(thread: ProjectThread): Promise<ProjectThread> {
      const next = {
        ...thread,
        updatedAt: nowIso(),
      }
      await storage.putThread(next)
      return next
    },

    async appendMessage(
      projectId: string,
      message: Omit<ProjectMessage, "id" | "createdAt"> & { id?: string; createdAt?: string }
    ): Promise<ProjectThread> {
      const existing = (await storage.getThread(projectId)) ?? {
        projectId,
        prompt: "",
        plan: null,
        messages: [],
        updatedAt: nowIso(),
      }
      const nextMessage: ProjectMessage = {
        id: message.id ?? createEntityId(),
        authorType: message.authorType,
        content: message.content,
        createdAt: message.createdAt ?? nowIso(),
      }
      const next: ProjectThread = {
        ...existing,
        messages: [...existing.messages, nextMessage].slice(-200),
        updatedAt: nowIso(),
      }
      await storage.putThread(next)
      return next
    },

    async duplicateLocalProject(
      title: string,
      document: FlowchartDocument
    ): Promise<ProjectRecord> {
      const created = await repository.createProject({
        title,
        mode: "flowchart",
        document,
        source: "autosave",
      })
      return created.project
    },
  }

  return repository
}

export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>
