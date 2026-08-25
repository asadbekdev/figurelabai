"use client"

import { useEffect, useRef } from "react"

import { useFlowchartEditorStore } from "@/lib/flowchart/store"
import { createIllustrationDocument } from "@/lib/illustration/schema"
import { useIllustrationCanvasStore } from "@/lib/illustration/store"
import { usePlotEditorStore } from "@/lib/plot/store"
import { checksumDocument } from "@/lib/product/workspace-checksum"
import { useProjectSessionStore, summarizeForCompare } from "@/lib/product/project-session"
import { createProjectSaveQueue } from "@/lib/product/save-queue"
import { getWorkspaceRepository, isMemoryWorkspace } from "@/lib/product/workspace-runtime"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import { nowIso } from "@/lib/product/workspace-types"

const AUTOSAVE_MS = 1_000

let flushCurrentProject: (() => Promise<void>) | null = null

function isActiveProject(projectId: string): boolean {
  return useProjectSessionStore.getState().projectId === projectId
}

export async function flushProjectSave(): Promise<void> {
  await flushCurrentProject?.()
}

export async function resolveConflictUseStored(): Promise<void> {
  const recovery = useProjectSessionStore.getState().recovery
  const conflict = recovery?.conflict
  const projectId = useProjectSessionStore.getState().projectId
  if (!conflict) return
  if (!projectId) return
  if (conflict.stored.content.kind !== "flowchart") return

  const repository = await getWorkspaceRepository()
  await repository.discardRecovery(projectId)

  useFlowchartEditorStore.getState().loadDocument(conflict.stored.content)
  useProjectSessionStore.getState().setSession({
    revision: conflict.stored.revision,
    documentId: conflict.stored.id,
    lastSavedAt: conflict.stored.createdAt,
    saveState: "saved",
    recovery: null,
    title: conflict.stored.content.metadata.title,
  })
}

export async function resolveConflictDuplicate(): Promise<string> {
  const recovery = useProjectSessionStore.getState().recovery
  const conflict = recovery?.conflict
  if (!conflict) throw new Error("There is no conflicting copy to keep.")
  if (conflict.local.kind !== "flowchart") {
    throw new Error("Only flowchart conflicts can be duplicated here.")
  }

  const project = await useWorkspaceStore
    .getState()
    .duplicateLocalProject(`${conflict.local.metadata.title} copy`, conflict.local)
  await resolveConflictUseStored()
  return project.id
}

async function persistIllustrationOrPlot(projectId: string): Promise<void> {
  const session = useProjectSessionStore.getState()
  if (session.projectId !== projectId) return
  const setSession = useProjectSessionStore.getState().setSession
  const repository = await getWorkspaceRepository()

  if (session.mode === "plot") {
    const document = usePlotEditorStore.getState().document ?? session.plotDocument
    if (!document) return
    const result = await repository.saveDocument(projectId, document, session.revision, "autosave")
    if (!result.ok || !isActiveProject(projectId)) return
    setSession({
      revision: result.revision,
      documentId: result.documentId,
      lastSavedAt: result.savedAt,
      saveState: isMemoryWorkspace() || !navigator.onLine ? "offline" : "saved",
      plotDocument: document,
    })
    return
  }

  if (session.mode !== "illustration") return
  const canvas = useIllustrationCanvasStore.getState()
  const asset = session.asset
  if (!asset) return
  const document = createIllustrationDocument({
    title: session.title || asset.prompt || "Illustration",
    mimeType: asset.mimeType,
    dataUrl: asset.dataUrl,
    width: canvas.page.width,
    height: canvas.page.height,
    objects: canvas.objects,
    comments: canvas.comments,
  })
  const result = await repository.saveDocument(projectId, document, session.revision, "autosave")
  if (!result.ok || !isActiveProject(projectId)) return
  setSession({
    revision: result.revision,
    documentId: result.documentId,
    lastSavedAt: result.savedAt,
    saveState: isMemoryWorkspace() || !navigator.onLine ? "offline" : "saved",
    illustrationDocument: document,
  })
}

async function persistProject(projectId: string): Promise<void> {
  const session = useProjectSessionStore.getState()
  if (
    session.projectId !== projectId ||
    session.saveState === "loading" ||
    session.saveState === "conflict" ||
    session.missing
  ) {
    return
  }
  if (isMemoryWorkspace()) {
    useProjectSessionStore.getState().setSession({ saveState: "offline" })
    return
  }
  if (session.mode === "plot" || session.mode === "illustration") {
    const setSession = useProjectSessionStore.getState().setSession
    setSession({ saveState: "saving" })
    try {
      await persistIllustrationOrPlot(projectId)
    } catch {
      if (isActiveProject(projectId)) setSession({ saveState: "offline" })
    }
    return
  }
  if (session.mode !== "flowchart") return

  const setSession = useProjectSessionStore.getState().setSession
  const document = useFlowchartEditorStore.getState().document
  const baseRevision = session.revision
  setSession({ saveState: "saving" })

  try {
    const repository = await getWorkspaceRepository()
    const result = await repository.saveDocument(
      projectId,
      document,
      baseRevision,
      "autosave"
    )

    if (!isActiveProject(projectId)) return
    if (!result.ok) {
      setSession({
        saveState: "conflict",
        recovery: {
          kind: "conflict",
          conflict: result.conflict,
          storedSummary: summarizeForCompare(
            result.conflict.stored.content,
            result.conflict.stored.revision,
            result.conflict.stored.checksum
          ),
          localSummary: summarizeForCompare(
            result.conflict.local,
            result.conflict.localBaseRevision,
            checksumDocument(result.conflict.local)
          ),
        },
      })
      return
    }

    setSession({
      revision: result.revision,
      documentId: result.documentId,
      lastSavedAt: result.savedAt,
      saveState: isMemoryWorkspace() || !navigator.onLine ? "offline" : "saved",
      recovery: null,
    })
    await useWorkspaceStore.getState().refresh()
  } catch {
    if (isActiveProject(projectId)) setSession({ saveState: "offline" })
    try {
      const repository = await getWorkspaceRepository()
      await repository.writeRecovery({
        projectId,
        baseRevision,
        document,
        updatedAt: nowIso(),
      })
    } catch {
      // Recovery uses the same local storage layer. If it is unavailable, the
      // editor remains explicitly offline and keeps the in-memory document.
    }
  }
}

export function useProjectPersistence(projectId: string) {
  const changeSerial = useFlowchartEditorStore((state) => state.changeSerial)
  const illustrationSerial = useIllustrationCanvasStore((state) => state.changeSerial)
  const loadDocument = useFlowchartEditorStore((state) => state.loadDocument)
  const setSession = useProjectSessionStore((state) => state.setSession)
  const resetSession = useProjectSessionStore((state) => state.reset)
  const openProject = useWorkspaceStore((state) => state.openProject)
  const saveQueueRef = useRef<ReturnType<typeof createProjectSaveQueue> | null>(null)

  if (saveQueueRef.current == null) {
    saveQueueRef.current = createProjectSaveQueue(() => persistProject(projectId))
  }

  useEffect(() => {
    let cancelled = false
    resetSession()
    setSession({
      projectId,
      saveState: "loading",
      missing: false,
      loadError: null,
      recovery: null,
    })

    void (async () => {
      try {
        const opened = await openProject(projectId)
        if (cancelled) return

        if (!opened) {
          if (isMemoryWorkspace() && projectId !== "demo") {
            setSession({
              projectId,
              missing: false,
              loadError:
                "Local project storage is temporarily unavailable. Reload after closing other FigureLab tabs; this screen will not overwrite the saved project.",
              saveState: "offline",
            })
          } else {
            setSession({ projectId, missing: true, loadError: null, saveState: "ready" })
          }
          return
        }

        const stored = opened.document

        if (opened.recovery && stored) {
          const recoveredChecksum = checksumDocument(opened.recovery.document)
          if (recoveredChecksum !== stored.checksum) {
            loadDocument(opened.recovery.document, { dirty: true })
            if (opened.recovery.baseRevision !== stored.revision) {
              setSession({
                projectId,
                title: opened.project.title,
                mode: opened.project.mode,
                revision: stored.revision,
                documentId: stored.id,
                lastSavedAt: stored.createdAt,
                versions: opened.versions,
                missing: false,
                thread: opened.thread,
                asset: opened.asset,
                saveState: "conflict",
                recovery: {
                  kind: "conflict",
                  conflict: {
                    code: "DOCUMENT_CONFLICT",
                    stored,
                    local: opened.recovery.document,
                    localBaseRevision: opened.recovery.baseRevision,
                  },
                  storedSummary: summarizeForCompare(
                    stored.content,
                    stored.revision,
                    stored.checksum
                  ),
                  localSummary: summarizeForCompare(
                    opened.recovery.document,
                    opened.recovery.baseRevision,
                    recoveredChecksum
                  ),
                },
              })
              return
            }
            setSession({
              projectId,
              title: opened.project.title,
              mode: opened.project.mode,
              revision: stored.revision,
              documentId: stored.id,
              lastSavedAt: stored.createdAt,
              versions: opened.versions,
              missing: false,
              thread: opened.thread,
              asset: opened.asset,
              saveState: "dirty",
              recovery: { kind: "unsaved" },
            })
            return
          }
        }

        if (opened.project.mode === "flowchart" && stored?.content.kind === "flowchart") {
          loadDocument(stored.content)
        }
        if (opened.project.mode === "illustration" && stored?.content.kind === "illustration") {
          useIllustrationCanvasStore.getState().hydrate({
            projectId,
            assetId:
              opened.asset?.id ?? stored.content.metadata.sourceAssetIds[0] ?? "illustration",
            width: stored.content.page.width,
            height: stored.content.page.height,
            objects: stored.content.objects,
            comments: stored.content.comments,
          })
        }
        setSession({
          projectId,
          title: opened.project.title,
          mode: opened.project.mode,
          revision: stored?.revision ?? 0,
          documentId: stored?.id ?? null,
          lastSavedAt: stored?.createdAt ?? null,
          versions: opened.versions,
          missing: false,
          loadError: null,
          saveState: isMemoryWorkspace() || !navigator.onLine ? "offline" : "saved",
          recovery: null,
          thread: opened.thread,
          asset: opened.asset,
          plotDocument:
            opened.project.mode === "plot" && stored?.content.kind === "plot"
              ? stored.content
              : null,
          illustrationDocument:
            opened.project.mode === "illustration" && stored?.content.kind === "illustration"
              ? stored.content
              : null,
        })
      } catch {
        if (cancelled) return
        setSession({
          projectId,
          missing: false,
          loadError:
            "This project is saved on this device, but its local data could not be read. Reload to retry without replacing your workspace.",
          saveState: "ready",
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [loadDocument, openProject, projectId, resetSession, setSession])

  useEffect(() => {
    const persist = saveQueueRef.current!.flush

    const writeRecovery = async () => {
      const session = useProjectSessionStore.getState()
      if (
        session.projectId !== projectId ||
        session.mode !== "flowchart" ||
        session.saveState === "loading"
      ) {
        return
      }
      const baseRevision = session.revision
      const document = useFlowchartEditorStore.getState().document
      if (isMemoryWorkspace()) {
        setSession({ saveState: "offline" })
        return
      }
      try {
        const repository = await getWorkspaceRepository()
        await repository.writeRecovery({
          projectId,
          baseRevision,
          document,
          updatedAt: nowIso(),
        })
      } catch {
        if (isActiveProject(projectId)) setSession({ saveState: "offline" })
      }
    }

    flushCurrentProject = persist

    const mode = useProjectSessionStore.getState().mode
    if (
      (changeSerial > 0 && mode === "flowchart") ||
      (illustrationSerial > 0 && mode === "illustration")
    ) {
      const session = useProjectSessionStore.getState()
      if (session.saveState !== "conflict" && !session.missing && session.saveState !== "loading") {
        setSession({ saveState: "dirty" })
        void writeRecovery()
        const timer = window.setTimeout(() => {
          void persist()
        }, AUTOSAVE_MS)
        const onHide = () => {
          void writeRecovery()
          void persist()
        }
        const onVisibility = () => {
          if (document.visibilityState === "hidden") onHide()
        }
        window.addEventListener("pagehide", onHide)
        document.addEventListener("visibilitychange", onVisibility)
        return () => {
          window.clearTimeout(timer)
          if (flushCurrentProject === persist) flushCurrentProject = null
          window.removeEventListener("pagehide", onHide)
          document.removeEventListener("visibilitychange", onVisibility)
        }
      }
    }

    const onHide = () => {
      const session = useProjectSessionStore.getState()
      if (
        session.projectId !== projectId ||
        session.saveState === "loading" ||
        session.mode !== "flowchart"
      ) {
        return
      }
      if (useFlowchartEditorStore.getState().changeSerial === 0) return
      void writeRecovery()
      void persist()
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onHide()
    }
    window.addEventListener("pagehide", onHide)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      if (flushCurrentProject === persist) flushCurrentProject = null
      window.removeEventListener("pagehide", onHide)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [changeSerial, illustrationSerial, projectId, setSession])
}
