"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShapesIcon, Trash2Icon, VectorSquareIcon } from "@/components/icons"
import { toast } from "sonner"

import { AppShellEmpty } from "@/components/product/app-shell"
import { FileUploadArea } from "@/components/product/file-upload-area"
import {
  PageIndex,
  PageIndexCard,
  PageIndexGrid,
  PageIndexHeader,
  PageIndexMeta,
  PageIndexSearch,
} from "@/components/product/page-index"
import { ViewModeToggle, type ViewMode } from "@/components/product/view-mode-toggle"
import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from "@/components/align/dialog"
import { ApiRequestError, postJson } from "@/lib/api/client"
import { parseAttachment } from "@/lib/product/attachments"
import { formatRelativeTime } from "@/lib/product/relative-time"
import { svgMarkupFromDataUrl } from "@/lib/vector-canvas/from-svg"
import { vectorDocumentDataUrl } from "@/lib/vector-canvas/render"
import { useVectorCanvasStore } from "@/lib/vector-canvas/store"
import type { VectorizeResponse } from "@/lib/vectorize/options"

type Sort = "recent" | "oldest" | "name"

const sortLabels: Record<Sort, string> = {
  recent: "Recently updated",
  oldest: "Oldest first",
  name: "Name A–Z",
}

export function VectorCanvasList() {
  const router = useRouter()
  const hydrated = useVectorCanvasStore((state) => state.hydrated)
  const documents = useVectorCanvasStore((state) => state.documents)
  const hydrate = useVectorCanvasStore((state) => state.hydrate)
  const createFromSvg = useVectorCanvasStore((state) => state.createFromSvg)
  const remove = useVectorCanvasStore((state) => state.remove)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<Sort>("recent")
  const [view, setView] = useState<ViewMode>("grid")
  const [tracing, setTracing] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = documents.filter((document) => {
      if (!needle) return true
      return document.title.toLowerCase().includes(needle)
    })
    return filtered.sort((left, right) => {
      if (sort === "oldest") return left.updatedAt.localeCompare(right.updatedAt)
      if (sort === "name") {
        return left.title.localeCompare(right.title, undefined, { sensitivity: "base" })
      }
      return right.updatedAt.localeCompare(left.updatedAt)
    })
  }, [documents, query, sort])

  async function openSvgFile(file: File) {
    const svg = svgMarkupFromDataUrl(await file.text())
    if (!svg) {
      toast.error("That SVG could not be read.")
      return
    }
    setTracing(true)
    try {
      const created = await createFromSvg({
        svg,
        title: file.name.replace(/\.[^.]+$/, "") || "Vector figure",
      })
      toast.success("Vector document created")
      router.push(`/vector-canvas/${created.id}`)
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "The SVG could not be opened as a vector document."
      )
    } finally {
      setTracing(false)
    }
  }

  async function vectorizeFile(file: File) {
    const isSvg =
      file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")
    if (isSvg) {
      await openSvgFile(file)
      return
    }

    const parsed = await parseAttachment(file)
    if (!parsed.ok || parsed.attachment.kind !== "image" || !parsed.attachment.dataUrl) {
      toast.error(
        parsed.ok
          ? "Drop a PNG, JPEG, WebP, or SVG file."
          : parsed.error.message
      )
      return
    }
    const inline = parsed.attachment.dataUrl.split(",")[1]
    const mime = parsed.attachment.mimeType
    if (!inline || (mime !== "image/png" && mime !== "image/jpeg" && mime !== "image/webp")) {
      toast.error("Drop a PNG, JPEG, WebP, or SVG file.")
      return
    }
    setTracing(true)
    try {
      const traced = await postJson<VectorizeResponse>("/api/vectorize", {
        image: { mimeType: mime, data: inline },
        detail: "balanced",
      })
      const created = await createFromSvg({
        svg: traced.svg,
        title: file.name.replace(/\.[^.]+$/, "") || "Vector figure",
      })
      toast.success("Vector document created")
      router.push(`/vector-canvas/${created.id}`)
    } catch (caught) {
      toast.error(
        caught instanceof ApiRequestError
          ? caught.message
          : "The image could not be traced."
      )
    } finally {
      setTracing(false)
    }
  }

  return (
    <PageIndex>
      <PageIndexHeader
        icon={<VectorSquareIcon aria-hidden="true" />}
        title="Vector canvas"
        description="Trace a raster figure or open an SVG as an editable document."
      />

      {!hydrated ? (
        <div className="space-y-3">
          <div className="h-32 rounded-xl bg-muted" />
          <div className="h-16 rounded-lg bg-muted" />
          <div className="h-16 rounded-lg bg-muted" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col gap-4">
          <FileUploadArea
            accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
            inputLabel="Upload a PNG, JPEG, WebP, or SVG"
            hint="PNG, JPEG, or WebP are traced. SVG opens as an editable vector document."
            disabled={tracing}
            onFile={(file) => {
              void vectorizeFile(file)
            }}
          />
          <p className="min-h-5 text-center text-caption text-hollow" role="status" aria-live="polite">
            {tracing ? "Preparing an editable vector document…" : ""}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-center">
            <p className="text-caption text-muted-foreground">
              Already have a FigureLab project? Open it and choose Vectorize.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/projects">Browse projects</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <PageIndexSearch
            id="vector-search"
            value={query}
            onChange={setQuery}
            placeholder="Search vector canvases..."
            label="Search vector canvases"
          />

          <PageIndexMeta
            countLabel={`All canvases (${matches.length})`}
            sort={sort}
            sortLabels={sortLabels}
            onSort={(value) => setSort(value as Sort)}
            extra={<ViewModeToggle value={view} onChange={setView} label="Vector canvas layout" />}
          />

          <FileUploadArea
            accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
            inputLabel="Upload a PNG, JPEG, WebP, or SVG"
            hint="PNG, JPEG, or WebP are traced. SVG opens as an editable vector document."
            disabled={tracing}
            onFile={(file) => {
              void vectorizeFile(file)
            }}
          />
          <p className="min-h-5 text-caption text-hollow" role="status" aria-live="polite">
            {tracing ? "Preparing an editable vector document…" : ""}
          </p>

          {matches.length === 0 ? (
            <AppShellEmpty
              headingLevel="h2"
              icon={<ShapesIcon aria-hidden="true" />}
              title={`No canvases match “${query.trim()}”`}
              description="Clear the search to restore every vector canvas."
              action={
                <Button type="button" variant="outline" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              }
            />
          ) : view === "grid" ? (
            <PageIndexGrid>
              {matches.map((document) => (
                <li key={document.id}>
                  <PageIndexCard
                    href={`/vector-canvas/${document.id}`}
                    preview={vectorDocumentDataUrl(document)}
                    title={document.title}
                    description={`${document.paths.length} paths`}
                    meta={`Updated ${formatRelativeTime(document.updatedAt)}`}
                    actions={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${document.title}`}
                        onClick={() => setPendingRemoval({ id: document.id, title: document.title })}
                      >
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    }
                  />
                </li>
              ))}
            </PageIndexGrid>
          ) : (
            <ul className="flex flex-col gap-1">
              {matches.map((document) => (
                <li key={document.id} className="flex items-center gap-1 rounded-lg hover:bg-hover-veil">
                  <Link
                    href={`/vector-canvas/${document.id}`}
                    className="min-w-0 flex-1 rounded-lg px-2.5 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="block truncate text-ui font-medium">{document.title}</span>
                    <span className="mt-0.5 block truncate text-caption text-hollow tabular-nums">
                      {document.paths.length} paths · {formatRelativeTime(document.updatedAt)}
                    </span>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="me-1"
                    aria-label={`Remove ${document.title}`}
                    onClick={() => setPendingRemoval({ id: document.id, title: document.title })}
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Dialog open={Boolean(pendingRemoval)} onOpenChange={(open) => !open && setPendingRemoval(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogIcon>
              <Trash2Icon aria-hidden="true" />
            </DialogIcon>
            <DialogTitle>Delete vector canvas?</DialogTitle>
            <DialogDescription>
              {pendingRemoval
                ? `“${pendingRemoval.title}” will be removed from this browser. This cannot be undone.`
                : "This vector canvas will be removed from this browser."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPendingRemoval(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!pendingRemoval) return
                void remove(pendingRemoval.id)
                setPendingRemoval(null)
                toast.success("Vector canvas deleted")
              }}
            >
              Delete canvas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageIndex>
  )
}
