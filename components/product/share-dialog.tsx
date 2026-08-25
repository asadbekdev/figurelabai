"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon, LinkIcon, Loader2Icon, Share2Icon, Trash2Icon } from "@/components/icons"
import { toast } from "sonner"

import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle,
  DialogTrigger,
} from "@/components/align/dialog"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import { ApiRequestError, getJson, postJson } from "@/lib/api/client"
import { useFlowchartEditorStore } from "@/lib/flowchart/store"
import { renderPlotSvg } from "@/lib/plot/render"
import { usePlotEditorStore } from "@/lib/plot/store"
import { useProjectSessionStore } from "@/lib/product/project-session"
import type { ShareSnapshot } from "@/lib/sharing/contracts"

const LINKS_KEY = "figurelab-share-links"

type StoredLink = { token: string; createdAt: string }

function readStoredLink(projectId: string): StoredLink | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(LINKS_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, StoredLink>
    const entry = map[projectId]
    return entry && typeof entry.token === "string" ? entry : null
  } catch {
    return null
  }
}

function writeStoredLink(projectId: string, link: StoredLink | null): void {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(LINKS_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, StoredLink>) : {}
    if (link) map[projectId] = link
    else delete map[projectId]
    window.localStorage.setItem(LINKS_KEY, JSON.stringify(map))
  } catch {
    // Storage full or blocked — the link still works while the server keeps it.
  }
}

type ShareDialogProps = {
  projectId: string
  buildSnapshot: () => ShareSnapshot | null
}

export function ShareDialog({ projectId, buildSnapshot }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<StoredLink | null>(null)
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) return
    setCopied(false)
    setError(null)
    const stored = readStoredLink(projectId)
    if (!stored) {
      setLink(null)
      return
    }
    setChecking(true)
    getJson<{ token: string }>(`/api/share/${stored.token}`)
      .then(() => setLink(stored))
      .catch(() => {
        writeStoredLink(projectId, null)
        setLink(null)
      })
      .finally(() => setChecking(false))
  }

  async function createLink() {
    const snapshot = buildSnapshot()
    if (!snapshot) {
      setError("There is no finished figure to share yet.")
      return
    }
    setCreating(true)
    setError(null)
    try {
      const result = await postJson<{ token: string; createdAt: string }>("/api/share", {
        ...snapshot,
        password: password.trim() || undefined,
      })
      const next = { token: result.token, createdAt: result.createdAt }
      writeStoredLink(projectId, next)
      setLink(next)
      toast.success("Share link created")
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ? caught.message : "The share link could not be created."
      )
    } finally {
      setCreating(false)
    }
  }

  async function revokeLink() {
    if (!link) return
    setRevoking(true)
    setError(null)
    try {
      const response = await fetch(`/api/share/${link.token}`, { method: "DELETE" })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string }
        } | null
        throw new Error(payload?.error?.message ?? "The link could not be revoked.")
      }
      writeStoredLink(projectId, null)
      setLink(null)
      toast.success("Share link revoked")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The link could not be revoked.")
    } finally {
      setRevoking(false)
    }
  }

  async function copyLink() {
    if (!link) return
    const url = `${window.location.origin}/share/${link.token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_600)
    } catch {
      toast.error("Copy failed. Select the link and copy it manually.")
    }
  }

  const url = link ? `/share/${link.token}` : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label="Share figure">
          <Share2Icon aria-hidden="true" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogIcon>
            <Share2Icon aria-hidden="true" />
          </DialogIcon>
          <DialogTitle>Share a read-only link</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this figure and its conversation. They cannot edit
            the project.
          </DialogDescription>
        </DialogHeader>

        {checking ? (
          <p className="flex items-center gap-2 text-caption text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Checking the existing link
          </p>
        ) : link && url ? (
          <div className="space-y-2">
            <Label htmlFor="share-link-url">Link</Label>
            <div className="flex gap-2">
              <Input id="share-link-url" readOnly value={url} onFocus={(e) => e.target.select()} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Copy share link"
                onClick={() => void copyLink()}
              >
                {copied ? (
                  <CheckIcon aria-hidden="true" />
                ) : (
                  <CopyIcon aria-hidden="true" />
                )}
              </Button>
            </div>
            <p className="text-caption text-hollow">
              Created {link.createdAt.slice(0, 10)}. The link shows the figure as it was when
              shared.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="share-password">Password (optional)</Label>
            <Input
              id="share-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave blank for an open link"
            />
            <p className="text-caption text-hollow">
              If set, viewers must enter this password. It is stored as a hash on this server.
            </p>
          </div>
        )}

        {error ? (
          <p className="text-caption text-muted-foreground" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          {link && url ? (
            <>
              <Button
                type="button"
                variant="ghost"
                disabled={revoking}
                onClick={() => void revokeLink()}
              >
                {revoking ? (
                  <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Trash2Icon aria-hidden="true" />
                )}
                Revoke
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() => void createLink()}
              >
                {creating ? (
                  <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <LinkIcon aria-hidden="true" />
                )}
                Replace figure
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => void createLink()}
              disabled={creating || checking || (password.length > 0 && password.length < 4)}
            >
              {creating ? (
                <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <LinkIcon aria-hidden="true" />
              )}
              {creating ? "Creating…" : "Create link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function shareMessages(
  thread: { messages: Array<{ authorType: string; content: string; createdAt: string }> } | null
): ShareSnapshot["messages"] {
  return (thread?.messages ?? [])
    .filter(
      (message): message is { authorType: "user" | "assistant" | "system"; content: string; createdAt: string } =>
        message.authorType === "user" ||
        message.authorType === "assistant" ||
        message.authorType === "system"
    )
    .slice(-50)
    .map((message) => ({
      authorType: message.authorType,
      content: message.content,
      createdAt: message.createdAt,
    }))
}

export function FlowchartShareDialog() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const title = useProjectSessionStore((state) => state.title)
  const thread = useProjectSessionStore((state) => state.thread)
  const document = useFlowchartEditorStore((state) => state.document)

  if (!projectId) return null

  return (
    <ShareDialog
      projectId={projectId}
      buildSnapshot={() => ({
        title: title || document.metadata.title,
        mode: "flowchart",
        prompt: thread?.prompt ?? "",
        document,
        messages: shareMessages(thread),
      })}
    />
  )
}

export function ImageShareDialog() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const title = useProjectSessionStore((state) => state.title)
  const mode = useProjectSessionStore((state) => state.mode)
  const thread = useProjectSessionStore((state) => state.thread)
  const asset = useProjectSessionStore((state) => state.asset)

  if (!projectId) return null

  return (
    <ShareDialog
      projectId={projectId}
      buildSnapshot={() => {
        if (!asset) return null
        return {
          title: title || asset.prompt || "Figure",
          mode: mode === "plot" ? "plot" : "illustration",
          prompt: thread?.prompt ?? asset.prompt ?? "",
          image: { mimeType: asset.mimeType, dataUrl: asset.dataUrl },
          messages: shareMessages(thread),
        }
      }}
    />
  )
}

export function PlotShareDialog() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const title = useProjectSessionStore((state) => state.title)
  const thread = useProjectSessionStore((state) => state.thread)
  const document = usePlotEditorStore((state) => state.document)

  if (!projectId || !document) return null

  return (
    <ShareDialog
      projectId={projectId}
      buildSnapshot={() => {
        const svg = renderPlotSvg(document)
        return {
          title: title || document.metadata.title,
          mode: "plot",
          prompt: thread?.prompt ?? "",
          image: {
            mimeType: "image/svg+xml",
            dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
          },
          messages: shareMessages(thread),
        }
      }}
    />
  )
}
