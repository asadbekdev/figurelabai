"use client"

import { useState } from "react"
import { toast } from "sonner"

import { VersionItem } from "@/components/product/editor-patterns"
import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/align/dialog"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import { useFlowchartEditorStore } from "@/lib/flowchart/store"
import { useIllustrationCanvasStore } from "@/lib/illustration/store"
import { usePlotEditorStore } from "@/lib/plot/store"
import { formatRelativeTime } from "@/lib/product/relative-time"
import { useProjectSessionStore } from "@/lib/product/project-session"
import { flushProjectSave } from "@/lib/product/use-project-persistence"
import { useWorkspaceStore } from "@/lib/product/workspace-store"

export function ProjectVersionsPanel() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const documentId = useProjectSessionStore((state) => state.documentId)
  const versions = useProjectSessionStore((state) => state.versions)
  const lastSavedAt = useProjectSessionStore((state) => state.lastSavedAt)
  const setSession = useProjectSessionStore((state) => state.setSession)
  const loadFlowchart = useFlowchartEditorStore((state) => state.loadDocument)
  const loadPlot = usePlotEditorStore((state) => state.loadDocument)
  const nameVersion = useWorkspaceStore((state) => state.nameVersion)
  const restoreVersion = useWorkspaceStore((state) => state.restoreVersion)
  const listVersions = useWorkspaceStore((state) => state.listVersions)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const currentIsNamed = versions.some((version) => version.documentId === documentId)

  async function refreshVersions(id: string) {
    const next = await listVersions(id)
    setSession({ versions: next })
  }

  async function handleName() {
    if (!projectId) return
    await flushProjectSave()
    const version = await nameVersion(projectId, name.trim() || `Version ${versions.length + 1}`)
    await refreshVersions(projectId)
    setOpen(false)
    setName("")
    toast.success(`${version.name} saved`)
  }

  async function handleRestore(versionId: string) {
    if (!projectId) return
    const opened = await restoreVersion(projectId, versionId)
    const content = opened.document?.content
    if (content?.kind === "flowchart") {
      loadFlowchart(content)
    } else if (content?.kind === "plot") {
      loadPlot(content)
    } else if (content?.kind === "illustration") {
      useIllustrationCanvasStore.getState().hydrate({
        projectId,
        assetId: opened.asset?.id ?? content.metadata.sourceAssetIds[0] ?? "illustration",
        width: content.page.width,
        height: content.page.height,
        objects: content.objects,
        comments: content.comments,
      })
    }

    const restoredAsset =
      content?.kind === "illustration"
        ? opened.asset
          ? { ...opened.asset, dataUrl: content.image.dataUrl, mimeType: content.image.mimeType }
          : {
              id: opened.document?.id ?? "illustration",
              projectId,
              kind: "generated_asset" as const,
              mimeType: content.image.mimeType,
              dataUrl: content.image.dataUrl,
              prompt: content.metadata.title,
              folderId: null,
              favorite: false,
              createdAt: opened.document?.createdAt ?? new Date().toISOString(),
            }
        : opened.asset

    setSession({
      revision: opened.document?.revision ?? 0,
      documentId: opened.document?.id ?? null,
      lastSavedAt: opened.document?.createdAt ?? null,
      versions: opened.versions,
      saveState: "saved",
      title: opened.project.title,
      asset: restoredAsset ?? opened.asset,
      plotDocument: content?.kind === "plot" ? content : null,
      illustrationDocument: content?.kind === "illustration" ? content : null,
    })
    toast.success("Version restored as a new revision")
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Name this version
      </Button>
      <p className="text-caption text-hollow">
        Select an older version to restore it. Restore writes a new revision and leaves history intact.
      </p>

      {!currentIsNamed && documentId ? (
        <VersionItem
          version="Draft"
          title="Current working copy"
          timestamp={lastSavedAt ? formatRelativeTime(lastSavedAt) : "Unsaved"}
          active
        />
      ) : null}

      {versions.map((version, index) => (
        <div key={version.id} className="space-y-1">
          <VersionItem
            version={`v${versions.length - index}`}
            title={version.name}
            timestamp={formatRelativeTime(version.createdAt)}
            active={version.documentId === documentId}
            onSelect={
              version.documentId === documentId ? undefined : () => void handleRestore(version.id)
            }
          />
        </div>
      ))}

      {versions.length === 0 && currentIsNamed === false ? (
        <p className="px-2.5 py-2 text-meta text-hollow">
          Named versions appear here after you checkpoint this figure.
        </p>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Name this version</DialogTitle>
            <DialogDescription>
              A named version is a durable checkpoint. Restoring it creates a new revision and
              leaves history intact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="version-name">Version name</Label>
            <Input
              id="version-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={`Version ${versions.length + 1}`}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleName()}>
              Save version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
