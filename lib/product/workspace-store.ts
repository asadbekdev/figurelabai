"use client"

import { create } from "zustand"

import type { FlowchartDocument } from "@/lib/flowchart/schema"

import { createIllustrationDocument } from "@/lib/illustration/schema"
import type { PlotDocument } from "@/lib/plot/schema"

import { getWorkspaceRepository, isMemoryWorkspace } from "./workspace-runtime"
import type {
  DocumentSource,
  FigureMode,
  LibraryFolder,
  OpenedProject,
  ProjectMessage,
  ProjectRecord,
  ProjectThread,
  ProjectVersionRecord,
  WorkspaceAsset,
} from "./workspace-types"
import type { FigurePlan } from "@/lib/generation/contracts"

type WorkspaceState = {
  hydrated: boolean
  offline: boolean
  error: string | null
  projects: ProjectRecord[]
  assets: WorkspaceAsset[]
  folders: LibraryFolder[]
  hydrate: () => Promise<void>
  refresh: () => Promise<void>
  createFolder: (name: string) => Promise<LibraryFolder>
  deleteFolder: (folderId: string) => Promise<void>
  setAssetFolder: (assetId: string, folderId: string | null) => Promise<void>
  setAssetFavorite: (assetId: string, favorite: boolean) => Promise<void>
  createFlowchartProject: (input: {
    title: string
    document: FlowchartDocument
    source?: DocumentSource
    nameGeneratedVersion?: boolean
    prompt?: string
    plan?: FigurePlan | null
    messages?: ProjectMessage[]
  }) => Promise<ProjectRecord>
  createImageProject: (input: {
    title: string
    mode: Extract<FigureMode, "illustration" | "plot">
    prompt: string
    mimeType: string
    dataUrl: string
    messages?: ProjectMessage[]
  }) => Promise<{ project: ProjectRecord; asset: WorkspaceAsset }>
  createPlotProject: (input: {
    title: string
    prompt: string
    document: PlotDocument
    mimeType?: string
    dataUrl?: string
    messages?: ProjectMessage[]
  }) => Promise<{ project: ProjectRecord; asset: WorkspaceAsset | null }>
  openProject: (projectId: string) => Promise<OpenedProject | null>
  renameProject: (projectId: string, title: string) => Promise<void>
  archiveProject: (projectId: string) => Promise<void>
  listVersions: (projectId: string) => Promise<ProjectVersionRecord[]>
  nameVersion: (projectId: string, name: string) => Promise<ProjectVersionRecord>
  restoreVersion: (projectId: string, versionId: string) => Promise<OpenedProject>
  addGeneratedImage: (input: {
    prompt: string
    mimeType: string
    dataUrl: string
    projectId?: string | null
  }) => Promise<WorkspaceAsset>
  saveThread: (thread: ProjectThread) => Promise<ProjectThread>
  appendMessage: (
    projectId: string,
    message: Omit<ProjectMessage, "id" | "createdAt"> & { id?: string; createdAt?: string }
  ) => Promise<ProjectThread>
  duplicateLocalProject: (title: string, document: FlowchartDocument) => Promise<ProjectRecord>
}

async function readLists() {
  const repository = await getWorkspaceRepository()
  const [projects, assets, folders] = await Promise.all([
    repository.listProjects(),
    repository.listAssets(),
    repository.listFolders(),
  ])
  return {
    projects,
    assets,
    folders,
    offline: isMemoryWorkspace() || (typeof navigator !== "undefined" && !navigator.onLine),
  }
}

const STORAGE_UNAVAILABLE_MESSAGE =
  "Durable local storage is unavailable. Close other FigureLab tabs, then reload before creating or editing projects."

async function getWritableWorkspaceRepository() {
  const repository = await getWorkspaceRepository()
  if (isMemoryWorkspace()) throw new Error(STORAGE_UNAVAILABLE_MESSAGE)
  return repository
}

let hydratePromise: Promise<void> | null = null

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  hydrated: false,
  offline: false,
  error: null,
  projects: [],
  assets: [],
  folders: [],

  hydrate: async () => {
    if (get().hydrated) return
    if (!hydratePromise) {
      hydratePromise = (async () => {
        const repository = await getWorkspaceRepository()
        try {
          await repository.ensureDemoProject()
          const lists = await readLists()
          set({
            hydrated: true,
            ...lists,
            error: isMemoryWorkspace() ? STORAGE_UNAVAILABLE_MESSAGE : null,
          })
        } catch {
          set({
            hydrated: true,
            offline:
              isMemoryWorkspace() ||
              (typeof navigator !== "undefined" && !navigator.onLine),
            error:
              "The local project index could not be read. Reload after closing other FigureLab tabs; saved projects will not be overwritten.",
          })
        }
      })().finally(() => {
        hydratePromise = null
      })
    }
    await hydratePromise
  },

  refresh: async () => {
    const lists = await readLists()
    set({
      ...lists,
      error: isMemoryWorkspace() ? STORAGE_UNAVAILABLE_MESSAGE : null,
    })
  },

  createFolder: async (name) => {
    const repository = await getWritableWorkspaceRepository()
    const folder = await repository.createFolder(name)
    await get().refresh()
    return folder
  },

  deleteFolder: async (folderId) => {
    const repository = await getWritableWorkspaceRepository()
    await repository.deleteFolder(folderId)
    await get().refresh()
  },

  setAssetFolder: async (assetId, folderId) => {
    const repository = await getWritableWorkspaceRepository()
    await repository.setAssetFolder(assetId, folderId)
    await get().refresh()
  },

  setAssetFavorite: async (assetId, favorite) => {
    const repository = await getWritableWorkspaceRepository()
    await repository.setAssetFavorite(assetId, favorite)
    await get().refresh()
  },

  createFlowchartProject: async ({
    title,
    document,
    source = "generation",
    nameGeneratedVersion = source === "generation",
    prompt = "",
    plan = null,
    messages = [],
  }) => {
    const repository = await getWritableWorkspaceRepository()
    const created = await repository.createProject({
      title,
      mode: "flowchart",
      document,
      source,
      thread: {
        prompt,
        plan,
        messages,
      },
    })
    if (nameGeneratedVersion) {
      await repository.nameVersion(created.project.id, "Generated layout")
    }
    await get().refresh()
    return created.project
  },

  createImageProject: async ({ title, mode, prompt, mimeType, dataUrl, messages = [] }) => {
    const repository = await getWritableWorkspaceRepository()
    const created = await repository.createProject({
      title,
      mode,
      source: "generation",
      document:
        mode === "illustration"
          ? createIllustrationDocument({
              title: title.trim() || "Illustration",
              mimeType,
              dataUrl,
            })
          : undefined,
      thread: {
        prompt,
        plan: null,
        messages,
      },
    })
    const asset = await repository.addAsset({
      projectId: created.project.id,
      kind: "generated_asset",
      mimeType,
      dataUrl,
      prompt,
    })
    await get().refresh()
    return { project: { ...created.project, currentAssetId: asset.id, status: "ready" }, asset }
  },

  createPlotProject: async ({ title, prompt, document, mimeType, dataUrl, messages = [] }) => {
    const repository = await getWritableWorkspaceRepository()
    const created = await repository.createProject({
      title,
      mode: "plot",
      document,
      source: mimeType && dataUrl ? "generation" : "autosave",
      thread: {
        prompt,
        plan: null,
        messages,
      },
    })
    const asset =
      mimeType && dataUrl
        ? await repository.addAsset({
            projectId: created.project.id,
            kind: "generated_asset",
            mimeType,
            dataUrl,
            prompt,
          })
        : null
    await get().refresh()
    return {
      project: {
        ...created.project,
        currentAssetId: asset?.id ?? created.project.currentAssetId,
        status: "ready",
      },
      asset,
    }
  },

  openProject: async (projectId) => {
    const repository = await getWorkspaceRepository()
    if (projectId === "demo") await repository.ensureDemoProject()
    const opened = await repository.openProject(projectId)
    try {
      if (get().hydrated) await get().refresh()
      else await get().hydrate()
    } catch {
      // Opening the requested record must not depend on every unrelated local
      // row parsing successfully. Keep the valid project usable while a later
      // workspace refresh can recover or report the corrupt list entry.
      set((state) => ({
        hydrated: true,
        error: state.error,
        offline:
          isMemoryWorkspace() ||
          (typeof navigator !== "undefined" && !navigator.onLine),
        projects:
          opened && !state.projects.some((project) => project.id === opened.project.id)
            ? [opened.project, ...state.projects]
            : state.projects,
      }))
    }
    return opened
  },

  renameProject: async (projectId, title) => {
    const repository = await getWritableWorkspaceRepository()
    await repository.renameProject(projectId, title)
    await get().refresh()
  },

  archiveProject: async (projectId) => {
    const repository = await getWritableWorkspaceRepository()
    await repository.archiveProject(projectId)
    await get().refresh()
  },

  listVersions: async (projectId) => {
    const repository = await getWorkspaceRepository()
    return repository.listVersions(projectId)
  },

  nameVersion: async (projectId, name) => {
    const repository = await getWritableWorkspaceRepository()
    const version = await repository.nameVersion(projectId, name)
    return version
  },

  restoreVersion: async (projectId, versionId) => {
    const repository = await getWritableWorkspaceRepository()
    const opened = await repository.restoreVersion(projectId, versionId)
    await get().refresh()
    return opened
  },

  addGeneratedImage: async (input) => {
    const repository = await getWritableWorkspaceRepository()
    const asset = await repository.addAsset({
      projectId: input.projectId ?? null,
      kind: "generated_asset",
      mimeType: input.mimeType,
      dataUrl: input.dataUrl,
      prompt: input.prompt,
    })
    await get().refresh()
    return asset
  },

  saveThread: async (thread) => {
    const repository = await getWritableWorkspaceRepository()
    return repository.saveThread(thread)
  },

  appendMessage: async (projectId, message) => {
    const repository = await getWritableWorkspaceRepository()
    return repository.appendMessage(projectId, message)
  },

  duplicateLocalProject: async (title, document) => {
    const repository = await getWritableWorkspaceRepository()
    const project = await repository.duplicateLocalProject(title, document)
    await get().refresh()
    return project
  },
}))
