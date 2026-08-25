"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/align/alert-dialog"
import { formatRelativeTime } from "@/lib/product/relative-time"
import { useProjectSessionStore } from "@/lib/product/project-session"
import {
  resolveConflictDuplicate,
  resolveConflictUseStored,
} from "@/lib/product/use-project-persistence"
import { isMemoryWorkspace } from "@/lib/product/workspace-runtime"

function saveLabel(
  saveState: ReturnType<typeof useProjectSessionStore.getState>["saveState"],
  lastSavedAt: string | null,
  revision: number,
  recovered: boolean,
  storageUnavailable: boolean
): string {
  if (saveState === "loading") return "Loading"
  if (saveState === "saving") return "Saving…"
  if (saveState === "dirty") return recovered ? "Recovered unsaved changes" : "Unsaved"
  if (saveState === "offline") {
    return storageUnavailable ? "Storage unavailable · changes not saved" : "Offline"
  }
  if (saveState === "conflict") return "Conflict"
  if (lastSavedAt) return `Saved · ${formatRelativeTime(lastSavedAt)} · rev ${revision}`
  return `Saved · rev ${revision}`
}

export function ProjectSaveStatus() {
  const router = useRouter()
  const saveState = useProjectSessionStore((state) => state.saveState)
  const lastSavedAt = useProjectSessionStore((state) => state.lastSavedAt)
  const revision = useProjectSessionStore((state) => state.revision)
  const recovery = useProjectSessionStore((state) => state.recovery)
  const recovered = recovery?.kind === "unsaved"
  const storageUnavailable = isMemoryWorkspace()

  return (
    <>
      <p
        className="truncate text-caption text-hollow tabular-nums"
        role="status"
        aria-label="Project save status"
        aria-live="polite"
      >
        <span className="sm:hidden">
          {saveState === "saving"
            ? "Saving…"
            : saveState === "dirty"
              ? recovered
                ? "Recovered"
                : "Unsaved"
              : saveState === "offline"
                ? storageUnavailable
                  ? "Not saved"
                  : "Offline"
                : saveState === "conflict"
                  ? "Conflict"
                  : saveState === "loading"
                    ? "Loading"
                    : "Saved"}
        </span>
        <span className="hidden sm:inline">
          {saveLabel(saveState, lastSavedAt, revision, recovered, storageUnavailable)}
        </span>
      </p>

      <AlertDialog open={saveState === "conflict"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Two copies of this figure exist</AlertDialogTitle>
            <AlertDialogDescription>
              Another save landed first. Neither copy was discarded. Compare them, then choose which
              project should keep the stored revision.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3 text-meta">
            <div className="rounded-lg border border-border px-3 py-3">
              <p className="text-ui font-medium">Stored revision</p>
              <p className="mt-1 text-muted-foreground tabular-nums">
                {recovery?.storedSummary?.title} · {recovery?.storedSummary?.nodeCount} nodes ·{" "}
                {recovery?.storedSummary?.edgeCount} edges · rev {recovery?.storedSummary?.revision}
              </p>
            </div>
            <div className="rounded-lg border border-border px-3 py-3">
              <p className="text-ui font-medium">This tab</p>
              <p className="mt-1 text-muted-foreground tabular-nums">
                {recovery?.localSummary?.title} · {recovery?.localSummary?.nodeCount} nodes ·{" "}
                {recovery?.localSummary?.edgeCount} edges · from rev{" "}
                {recovery?.localSummary?.revision}
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                void resolveConflictUseStored().catch(() => {
                  toast.error("The stored copy could not be confirmed", {
                    description: "Keep both copies open and retry after local storage recovers.",
                  })
                })
              }}
            >
              Use stored
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void resolveConflictDuplicate().then((projectId) => {
                  router.push(`/project/${projectId}`)
                })
              }}
            >
              Keep this tab as a new project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
