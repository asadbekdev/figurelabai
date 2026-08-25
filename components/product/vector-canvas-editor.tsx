"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  CircleIcon,
  FileImageIcon,
  FileType2Icon,
  FrameIcon,
  ImageAddIcon,
  LineIcon,
  MousePointer2Icon,
  PencilIcon,
  PlusIcon,
  Redo2Icon,
  ShapesIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
} from "@/components/icons"
import { toast } from "sonner"

import { AppShellEmpty, AppShellLoading } from "@/components/product/app-shell"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/align/sheet"
import { downloadArtifact, exportFilename } from "@/lib/flowchart/export"
import { createVectorJpg, createVectorPng } from "@/lib/vector-canvas/export"
import { createDrawnVectorObject } from "@/lib/vector-canvas/create-shape"
import { vectorImageFromFile } from "@/lib/vector-canvas/image-object"
import {
  hitTestTopVectorObject,
  moveVectorObjects,
  vectorObjectBounds,
  vectorObjectLabel,
} from "@/lib/vector-canvas/objects"
import { appendStrokePoint, strokeToPath } from "@/lib/vector-canvas/pencil"
import {
  createVectorDocumentId,
  VECTOR_INK,
  type VectorDocument,
  type VectorObject,
} from "@/lib/vector-canvas/schema"
import {
  normalizeRect,
  objectsInRect,
  toggleSelectedIds,
  unionSelectedIds,
} from "@/lib/vector-canvas/selection"
import { renderVectorDocumentSvg } from "@/lib/vector-canvas/render"
import {
  normalizeHex,
  patchVectorObjectStyle,
  vectorObjectDash,
  vectorObjectFill,
  vectorObjectOpacity,
  vectorObjectStroke,
  vectorObjectStrokeWidth,
} from "@/lib/vector-canvas/style"
import { useVectorCanvasStore } from "@/lib/vector-canvas/store"
import { cn } from "@/lib/utils"

type Tool = "select" | "text" | "rect" | "frame" | "line" | "ellipse" | "pencil"

export function VectorCanvasEditor({ documentId }: { documentId: string }) {
  const router = useRouter()
  const hydrated = useVectorCanvasStore((state) => state.hydrated)
  const documents = useVectorCanvasStore((state) => state.documents)
  const hydrate = useVectorCanvasStore((state) => state.hydrate)
  const update = useVectorCanvasStore((state) => state.update)
  const rename = useVectorCanvasStore((state) => state.rename)
  const remove = useVectorCanvasStore((state) => state.remove)

  const document = documents.find((item) => item.id === documentId) ?? null
  const [tool, setTool] = useState<Tool>("select")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(null)
  const [textDraft, setTextDraft] = useState("")
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 24, y: 24 })
  const [past, setPast] = useState<VectorObject[][]>([])
  const [future, setFuture] = useState<VectorObject[][]>([])
  const [dragOffset, setDragOffset] = useState<{ ids: string[]; dx: number; dy: number } | null>(null)
  const [exporting, setExporting] = useState<"png" | "jpg" | null>(null)
  const [objectsOpen, setObjectsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const drag = useRef<{
    kind: "pan" | "draw" | "move" | "pencil" | "box" | "line"
    startX: number
    startY: number
    originX: number
    originY: number
    additive?: boolean
    shift?: boolean
  } | null>(null)
  const [strokePreview, setStrokePreview] = useState<Array<{ x: number; y: number }>>([])
  const [linePreview, setLinePreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [rectPreview, setRectPreview] = useState<{
    x: number
    y: number
    width: number
    height: number
    circle?: boolean
  } | null>(null)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const displayObjects = useMemo(() => {
    const objects = document?.objects ?? []
    if (!dragOffset) return objects
    return moveVectorObjects(objects, dragOffset.ids, dragOffset.dx, dragOffset.dy)
  }, [document?.objects, dragOffset])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (event.code === "Space") {
        event.preventDefault()
        setSpaceHeld(true)
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length > 0 && document) {
        event.preventDefault()
        const remaining = document.objects.filter((object) => !selectedIds.includes(object.id))
        setPast((current) => [...current, document.objects].slice(-60))
        setFuture([])
        void update(documentId, (current) => ({ ...current, objects: remaining }))
        setSelectedIds([])
        setSelectedPathIndex(null)
      }
      if (event.key === "Escape") {
        setPendingText(null)
        setSelectedIds([])
        setSelectedPathIndex(null)
        setTool("select")
      }
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setSpaceHeld(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [document, documentId, selectedIds, update])

  const svg = useMemo(
    () => (document ? renderVectorDocumentSvg({ ...document, objects: displayObjects }) : null),
    [displayObjects, document]
  )

  if (!hydrated) {
    return <AppShellLoading title="Vector canvas" description="Opening the saved vector document." />
  }

  if (!document || !svg) {
    return (
      <AppShellEmpty
        title="Vector canvas not found"
        description="That document is not in this browser."
        action={
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/vector-canvas">
              <ArrowLeftIcon aria-hidden="true" />
              Back to vector canvases
            </Link>
          </Button>
        }
      />
    )
  }

  function canvasPoint(event: { clientX: number; clientY: number }, bounds: DOMRect) {
    return {
      x: (event.clientX - bounds.left - pan.x) / zoom,
      y: (event.clientY - bounds.top - pan.y) / zoom,
    }
  }

  function changeZoom(multiplier: number) {
    setZoom((current) =>
      Number(Math.min(4, Math.max(0.25, current * multiplier)).toFixed(2))
    )
  }

  function resetView() {
    setZoom(1)
    setPan({ x: 24, y: 24 })
  }

  async function submitTitle(input: HTMLInputElement) {
    const next = input.value.trim()
    if (!next) {
      input.value = document?.title ?? "Vector figure"
      toast.error("Enter a canvas title.")
      return
    }
    if (!document || next === document.title) return
    try {
      await rename(documentId, next)
      toast.success("Canvas renamed")
    } catch {
      input.value = document.title
      toast.error("The canvas could not be renamed.")
    }
  }

  async function deleteDocument() {
    if (deleteBusy) return
    setDeleteBusy(true)
    try {
      await remove(documentId)
      toast.success("Vector canvas deleted")
      router.push("/vector-canvas")
    } catch {
      toast.error("The vector canvas could not be deleted.")
      setDeleteBusy(false)
    }
  }

  function commitObjects(next: VectorObject[]) {
    if (!document) return
    setPast((current) => [...current, document.objects].slice(-60))
    setFuture([])
    void update(documentId, (current) => ({ ...current, objects: next }))
  }

  function pathIndexFromEvent(event: { target: EventTarget | null }): number | null {
    const target = event.target
    if (!(target instanceof Element)) return null
    const raw = target.getAttribute("data-path-index")
    if (raw == null) return null
    const index = Number.parseInt(raw, 10)
    return Number.isInteger(index) ? index : null
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = canvasPoint(event, bounds)
    const additive = event.shiftKey
    if (tool === "select" && !spaceHeld) {
      const pathIndex = pathIndexFromEvent(event)
      if (pathIndex != null) {
        setSelectedPathIndex(pathIndex)
        setSelectedIds([])
        return
      }
    }
    if (tool === "text") {
      setPendingText(point)
      setTextDraft("")
      return
    }
    if (tool === "pencil") {
      drag.current = {
        kind: "pencil",
        startX: point.x,
        startY: point.y,
        originX: point.x,
        originY: point.y,
      }
      setStrokePreview([point])
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (tool === "line") {
      drag.current = {
        kind: "line",
        startX: point.x,
        startY: point.y,
        originX: point.x,
        originY: point.y,
      }
      setLinePreview({ x1: point.x, y1: point.y, x2: point.x, y2: point.y })
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    if (tool === "rect" || tool === "frame" || tool === "ellipse") {
      drag.current = {
        kind: "draw",
        startX: point.x,
        startY: point.y,
        originX: point.x,
        originY: point.y,
        shift: event.shiftKey,
      }
      setRectPreview(null)
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (spaceHeld) {
      drag.current = {
        kind: "pan",
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    const hit = hitTestTopVectorObject(displayObjects, point.x, point.y)
    if (hit) {
      const nextIds = additive
        ? toggleSelectedIds(selectedIds, hit.id)
        : selectedIds.includes(hit.id)
          ? selectedIds
          : [hit.id]
      setSelectedIds(nextIds)
      setSelectedPathIndex(null)
      drag.current = {
        kind: "move",
        startX: point.x,
        startY: point.y,
        originX: point.x,
        originY: point.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (event.pointerType === "touch") {
      drag.current = {
        kind: "pan",
        startX: event.clientX,
        startY: event.clientY,
        originX: pan.x,
        originY: pan.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (!additive) {
      setSelectedIds([])
      setSelectedPathIndex(null)
    }
    drag.current = {
      kind: "box",
      startX: point.x,
      startY: point.y,
      originX: point.x,
      originY: point.y,
      additive,
    }
    setRectPreview(null)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    if (drag.current.kind === "pan") {
      setPan({
        x: drag.current.originX + (event.clientX - drag.current.startX),
        y: drag.current.originY + (event.clientY - drag.current.startY),
      })
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = canvasPoint(event, bounds)
    if (drag.current.kind === "move") {
      setDragOffset({
        ids: selectedIds,
        dx: point.x - drag.current.startX,
        dy: point.y - drag.current.startY,
      })
      return
    }
    if (drag.current.kind === "pencil") {
      setStrokePreview((current) => appendStrokePoint(current, point))
      return
    }
    if (drag.current.kind === "line") {
      setLinePreview({
        x1: drag.current.originX,
        y1: drag.current.originY,
        x2: point.x,
        y2: point.y,
      })
      return
    }
    const circle = tool === "ellipse" && (event.shiftKey || drag.current.shift)
    const rect = normalizeRect(
      { x: drag.current.originX, y: drag.current.originY },
      point
    )
    setRectPreview({ ...rect, circle })
  }

  function onPointerUp() {
    const current = drag.current
    drag.current = null
    if (current?.kind === "move" && dragOffset && document) {
      commitObjects(moveVectorObjects(document.objects, dragOffset.ids, dragOffset.dx, dragOffset.dy))
      setDragOffset(null)
      return
    }
    if (current?.kind === "pencil") {
      const points = strokePreview
      setStrokePreview([])
      if (points.length >= 2) {
        const next: VectorObject = {
          id: createVectorDocumentId(),
          type: "pencil",
          points,
          stroke: VECTOR_INK,
          strokeWidth: 2,
        }
        commitObjects([...(document?.objects ?? []), next])
        setSelectedIds([next.id])
        toast.success("Stroke added")
      }
      return
    }
    if (current?.kind === "line" && linePreview) {
      const next = createDrawnVectorObject({
        tool: "line",
        start: { x: linePreview.x1, y: linePreview.y1 },
        end: { x: linePreview.x2, y: linePreview.y2 },
      })
      setLinePreview(null)
      if (next) {
        commitObjects([...(document?.objects ?? []), next])
        setSelectedIds([next.id])
        toast.success("Line added")
      }
      return
    }
    if (current?.kind === "box") {
      const hits = rectPreview ? objectsInRect(displayObjects, rectPreview).map((object) => object.id) : []
      setSelectedIds((currentIds) => (current?.additive ? unionSelectedIds(currentIds, hits) : hits))
      setRectPreview(null)
      return
    }
    if (current?.kind === "draw" && rectPreview && (tool === "rect" || tool === "frame" || tool === "ellipse")) {
      const next = createDrawnVectorObject({
        tool,
        start: { x: current.originX, y: current.originY },
        end: {
          x: current.originX + (rectPreview.x < current.originX ? -rectPreview.width : rectPreview.width),
          y: current.originY + (rectPreview.y < current.originY ? -rectPreview.height : rectPreview.height),
        },
        circle: Boolean(rectPreview.circle),
      })
      if (next) {
        commitObjects([...(document?.objects ?? []), next])
        setSelectedIds([next.id])
        toast.success(tool === "frame" ? "Frame added" : tool === "ellipse" ? "Ellipse added" : "Rectangle added")
      }
    }
    setRectPreview(null)
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const next = Math.min(4, Math.max(0.25, zoom * (event.deltaY > 0 ? 0.9 : 1.1)))
    setZoom(Number(next.toFixed(2)))
  }

  async function placeText() {
    if (!pendingText || !textDraft.trim() || !document) return
    const next: VectorObject = {
      id: createVectorDocumentId(),
      type: "text",
      x: pendingText.x,
      y: pendingText.y,
      text: textDraft.trim(),
      fill: VECTOR_INK,
      fontSize: 18,
    }
    commitObjects([...document.objects, next])
    setSelectedIds([next.id])
    setPendingText(null)
    setTextDraft("")
    toast.success("Text added")
  }

  function undo() {
    const previous = past.at(-1)
    if (!previous || !document) return
    setPast((current) => current.slice(0, -1))
    setFuture((current) => [...current, document.objects])
    void update(documentId, (current) => ({ ...current, objects: previous }))
  }

  function redo() {
    const upcoming = future.at(-1)
    if (!upcoming || !document) return
    setFuture((current) => current.slice(0, -1))
    setPast((current) => [...current, document.objects])
    void update(documentId, (current) => ({ ...current, objects: upcoming }))
  }

  function exportSvg() {
    if (!document) return
    downloadArtifact(
      new Blob([renderVectorDocumentSvg(document)], { type: "image/svg+xml;charset=utf-8" }),
      exportFilename(document.title, "svg")
    )
    toast.success("SVG downloaded")
  }

  async function exportPng() {
    if (!document) return
    setExporting("png")
    try {
      const artifact = await createVectorPng(document)
      downloadArtifact(artifact, exportFilename(document.title, "png"))
      toast.success("PNG downloaded")
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "The browser could not create this PNG.",
      })
    } finally {
      setExporting(null)
    }
  }

  async function exportJpg() {
    if (!document) return
    setExporting("jpg")
    try {
      const artifact = await createVectorJpg(document)
      downloadArtifact(artifact, exportFilename(document.title, "jpg"))
      toast.success("JPG downloaded")
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "The browser could not create this JPG.",
      })
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b border-border/70 px-3 py-2 md:flex-row md:items-center md:px-4">
        <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="shrink-0" asChild>
          <Link href="/vector-canvas">
            <ArrowLeftIcon aria-hidden="true" />
            <span className="hidden sm:inline">All canvases</span>
            <span className="sr-only sm:hidden">Back to all canvases</span>
          </Link>
        </Button>
        <Label htmlFor="vector-title" className="sr-only">
          Title
        </Label>
        <Input
          id="vector-title"
          key={document.title}
          defaultValue={document.title}
          className="min-w-0 flex-1 md:w-56"
          onBlur={(event) => {
            void submitTitle(event.currentTarget)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
          }}
        />
        <Sheet open={objectsOpen} onOpenChange={setObjectsOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="shrink-0 md:hidden">
              <ShapesIcon aria-hidden="true" />
              Objects
              <span className="tabular-nums text-hollow">
                {document.paths.length + document.objects.length}
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Objects</SheetTitle>
              <SheetDescription>Select an object to edit its appearance.</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <VectorObjectsPanel
                document={document}
                hideHeading
                selectedPathIndex={selectedPathIndex}
                selectedIds={selectedIds}
                onSelectPath={(index) => {
                  setSelectedPathIndex(index)
                  setSelectedIds([])
                }}
                onSelectObject={(id, additive) => {
                  setSelectedPathIndex(null)
                  setSelectedIds((current) => (additive ? toggleSelectedIds(current, id) : [id]))
                }}
                onPathFillChange={(index, hex) => {
                  void update(documentId, (current) => ({
                    ...current,
                    paths: current.paths.map((path, pathIndex) =>
                      pathIndex === index ? { ...path, fill: hex } : path
                    ),
                  }))
                }}
                onObjectChange={(next) => {
                  commitObjects(document.objects.map((item) => (item.id === next.id ? next : item)))
                }}
                onRemoveSelected={() => {
                  commitObjects(document.objects.filter((object) => !selectedIds.includes(object.id)))
                  setSelectedIds([])
                  setSelectedPathIndex(null)
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
        </div>
        <div
          className="flex w-full items-center gap-1 overflow-x-auto pb-1 md:ms-auto md:w-auto md:overflow-visible md:pb-0"
          role="toolbar"
          aria-label="Canvas tools"
        >
          {(
            [
              { id: "select", label: "Select", icon: MousePointer2Icon },
              { id: "text", label: "Text", icon: TypeIcon },
              { id: "rect", label: "Rectangle", icon: ShapesIcon },
              { id: "ellipse", label: "Ellipse", icon: CircleIcon },
              { id: "line", label: "Line", icon: LineIcon },
              { id: "frame", label: "Frame", icon: FrameIcon },
              { id: "pencil", label: "Pencil", icon: PencilIcon },
            ] as const
          ).map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                type="button"
                variant={tool === item.id ? "secondary" : "ghost"}
                size="sm"
                className="shrink-0"
                aria-pressed={tool === item.id}
                onClick={() => {
                  setTool(item.id)
                  setPendingText(null)
                }}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Button>
            )
          })}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Undo"
            title="Undo"
            disabled={past.length === 0}
            onClick={undo}
          >
            <Undo2Icon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Redo"
            title="Redo"
            disabled={future.length === 0}
            onClick={redo}
          >
            <Redo2Icon aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => imageInput.current?.click()}
            className="shrink-0"
          >
            <ImageAddIcon aria-hidden="true" />
            Image
          </Button>
          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            aria-label="Upload an image onto the canvas"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (!file || !document) return
              void (async () => {
                try {
                  const next = await vectorImageFromFile(file, {
                    x: Math.max(16, (document.page.width - 320) / 2),
                    y: Math.max(16, (document.page.height - 320) / 2),
                  })
                  commitObjects([...document.objects, next])
                  setSelectedIds([next.id])
                  toast.success("Image added")
                } catch (error) {
                  toast.error("Image could not be added", {
                    description: error instanceof Error ? error.message : "Choose a smaller PNG, JPEG, WebP, or GIF.",
                  })
                }
              })()
            }}
          />
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={exportSvg}>
            <FileType2Icon aria-hidden="true" />
            SVG
          </Button>
          <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={Boolean(exporting)} onClick={() => void exportPng()}>
            <FileImageIcon aria-hidden="true" />
            PNG
          </Button>
          <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={Boolean(exporting)} onClick={() => void exportJpg()}>
            <FileImageIcon aria-hidden="true" />
            JPG
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon aria-hidden="true" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden bg-sidebar",
            tool === "text"
              ? "cursor-text"
              : tool === "select" && spaceHeld
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-crosshair"
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
        >
          <div
            className="absolute origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <div
              className="[&>svg]:block"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-visible"
              width={document.page.width}
              height={document.page.height}
            >
              {selectedIds.map((id) => {
                const object = displayObjects.find((item) => item.id === id)
                if (!object) return null
                const bounds = vectorObjectBounds(object)
                return (
                  <rect
                    key={id}
                    x={bounds.x - 2}
                    y={bounds.y - 2}
                    width={bounds.width + 4}
                    height={bounds.height + 4}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1 / zoom}
                    strokeDasharray="4 3"
                  />
                )
              })}
              {strokePreview.length > 1 ? (
                <path
                  d={strokeToPath(strokePreview)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {linePreview ? (
                <line
                  x1={linePreview.x1}
                  y1={linePreview.y1}
                  x2={linePreview.x2}
                  y2={linePreview.y2}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              ) : null}
              {rectPreview ? (
                tool === "ellipse" ? (
                  <ellipse
                    cx={rectPreview.x + rectPreview.width / 2}
                    cy={rectPreview.y + rectPreview.height / 2}
                    rx={rectPreview.width / 2}
                    ry={rectPreview.height / 2}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  />
                ) : (
                  <rect
                    x={rectPreview.x}
                    y={rectPreview.y}
                    width={rectPreview.width}
                    height={rectPreview.height}
                    fill="currentColor"
                    fillOpacity={0.08}
                    stroke="currentColor"
                    strokeWidth={1}
                    strokeDasharray={tool === "select" ? "4 3" : undefined}
                  />
                )
              ) : null}
            </svg>
          </div>
          <p className="pointer-events-none absolute inset-x-3 bottom-3 hidden pe-44 text-caption text-hollow tabular-nums sm:block">
            {Math.round(zoom * 100)}% · scroll to zoom ·{" "}
            {tool === "select"
              ? "drag a box to select · Shift-click to add · hold Space to pan"
              : tool === "text"
                ? "click to place text"
                : tool === "pencil"
                  ? "drag to draw a freehand stroke"
                  : tool === "line"
                    ? "drag to draw a line"
                    : tool === "ellipse"
                      ? "drag to draw an ellipse · hold Shift for a circle"
                      : "drag to draw"}
          </p>
          <div
            className="absolute end-3 bottom-3 flex items-center gap-1 rounded-xl bg-background p-1 shadow-regular-xs ring-1 ring-border"
            role="group"
            aria-label="Canvas zoom"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="max-md:size-11"
              aria-label="Zoom out"
              disabled={zoom <= 0.25}
              onClick={() => changeZoom(0.9)}
            >
              <LineIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-w-16 tabular-nums max-md:h-11"
              aria-label="Reset zoom and canvas position"
              onClick={resetView}
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="max-md:size-11"
              aria-label="Zoom in"
              disabled={zoom >= 4}
              onClick={() => changeZoom(1.1)}
            >
              <PlusIcon aria-hidden="true" />
            </Button>
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 overflow-y-auto border-s border-border/70 p-4 md:block">
          <VectorObjectsPanel
            document={document}
            selectedPathIndex={selectedPathIndex}
            selectedIds={selectedIds}
            onSelectPath={(index) => {
              setSelectedPathIndex(index)
              setSelectedIds([])
            }}
            onSelectObject={(id, additive) => {
              setSelectedPathIndex(null)
              setSelectedIds((current) => (additive ? toggleSelectedIds(current, id) : [id]))
            }}
            onPathFillChange={(index, hex) => {
              void update(documentId, (current) => ({
                ...current,
                paths: current.paths.map((path, pathIndex) =>
                  pathIndex === index ? { ...path, fill: hex } : path
                ),
              }))
            }}
            onObjectChange={(next) => {
              commitObjects(document.objects.map((item) => (item.id === next.id ? next : item)))
            }}
            onRemoveSelected={() => {
              commitObjects(document.objects.filter((object) => !selectedIds.includes(object.id)))
              setSelectedIds([])
              setSelectedPathIndex(null)
            }}
          />
        </aside>
      </div>

      <Dialog open={Boolean(pendingText)} onOpenChange={(open) => !open && setPendingText(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add text</DialogTitle>
            <DialogDescription>Enter the label to place on the canvas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
              <Label htmlFor="vector-text">Text</Label>
              <Input
                id="vector-text"
                value={textDraft}
                onChange={(event) => setTextDraft(event.target.value)}
                placeholder="Label this region"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void placeText()
                  }
                  if (event.key === "Escape") setPendingText(null)
                }}
              />
          </div>
          <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPendingText(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={!textDraft.trim()} onClick={() => void placeText()}>
                Place text
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleteBusy) setDeleteOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete vector canvas?</DialogTitle>
            <DialogDescription>
              “{document.title}” will be removed from this browser. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleteBusy}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => void deleteDocument()}
            >
              {deleteBusy ? "Deleting…" : "Delete canvas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function VectorObjectsPanel({
  document,
  selectedPathIndex,
  selectedIds,
  onSelectPath,
  onSelectObject,
  onPathFillChange,
  onObjectChange,
  onRemoveSelected,
  hideHeading = false,
}: {
  document: VectorDocument
  selectedPathIndex: number | null
  selectedIds: string[]
  onSelectPath: (index: number) => void
  onSelectObject: (id: string, additive: boolean) => void
  onPathFillChange: (index: number, hex: string) => void
  onObjectChange: (object: VectorObject) => void
  onRemoveSelected: () => void
  hideHeading?: boolean
}) {
  return (
    <>
      {hideHeading ? null : <h2 className="text-ui font-medium">Objects</h2>}
      <p className="mt-1 text-caption text-hollow tabular-nums">
        {document.paths.length} traced paths · {document.objects.length} added
      </p>
      {document.paths.length === 0 && document.objects.length === 0 ? (
        <p className="mt-4 text-meta text-hollow">
          Add text, shapes, a line, a pencil stroke, or an image.
        </p>
      ) : null}
      {document.paths.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-1">
          {document.paths.map((path, index) => (
            <li key={`path-${index}-${path.d.slice(0, 24)}`}>
              <button
                type="button"
                className={cn(
                  "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-ui outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50",
                  selectedPathIndex === index && "bg-hover-veil"
                )}
                aria-pressed={selectedPathIndex === index}
                onClick={() => onSelectPath(index)}
              >
                <span className="truncate">Path {index + 1}</span>
                <span className="text-caption text-hollow">path</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {document.objects.length > 0 ? (
        <ul className={cn("flex flex-col gap-1", document.paths.length > 0 ? "mt-2" : "mt-4")}>
          {document.objects.map((object) => (
            <li key={object.id}>
              <button
                type="button"
                className={cn(
                  "flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-ui outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50",
                  selectedIds.includes(object.id) && "bg-hover-veil"
                )}
                aria-pressed={selectedIds.includes(object.id)}
                onClick={(event) => onSelectObject(object.id, event.shiftKey)}
              >
                <span className="truncate">{vectorObjectLabel(object)}</span>
                <span className="text-caption text-hollow">{object.type}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : document.paths.length > 0 ? (
        <p className="mt-4 text-meta text-hollow">
          Select a path to edit its fill. Add text, shapes, or a stroke on top.
        </p>
      ) : null}
      {selectedPathIndex != null && document.paths[selectedPathIndex] ? (
        <VectorPathStyleInspector
          fill={document.paths[selectedPathIndex].fill}
          pathKey={`${selectedPathIndex}-${document.paths[selectedPathIndex].fill}`}
          onFillChange={(hex) => onPathFillChange(selectedPathIndex, hex)}
        />
      ) : null}
      {selectedIds.length === 1 ? (
        <VectorStyleInspector
          object={document.objects.find((item) => item.id === selectedIds[0]) ?? null}
          onChange={onObjectChange}
        />
      ) : null}
      {selectedIds.length > 0 ? (
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onRemoveSelected}>
            <Trash2Icon aria-hidden="true" />
            Remove {selectedIds.length === 1 ? "object" : `${selectedIds.length} objects`}
          </Button>
        </div>
      ) : null}
    </>
  )
}

function VectorPathStyleInspector({
  fill,
  pathKey,
  onFillChange,
}: {
  fill: string
  pathKey: string
  onFillChange: (hex: string) => void
}) {
  function applyHex(value: string) {
    const hex = normalizeHex(value)
    if (!hex) return
    onFillChange(hex)
  }

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-ui font-medium">Style</h3>
      <div className="space-y-1.5">
        <Label htmlFor="vector-fill-hex">Fill HEX</Label>
        <Input
          id="vector-fill-hex"
          className="font-mono tabular-nums"
          defaultValue={fill}
          key={`fill-${pathKey}`}
          onBlur={(event) => applyHex(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") applyHex(event.currentTarget.value)
          }}
        />
      </div>
      <p className="text-caption text-hollow">
        Use a 3- or 6-digit hex value. Invalid values are ignored.
      </p>
    </div>
  )
}

function VectorStyleInspector({
  object,
  onChange,
}: {
  object: VectorObject | null
  onChange: (object: VectorObject) => void
}) {
  if (!object) return null
  const fill = vectorObjectFill(object)
  const stroke = vectorObjectStroke(object)
  const strokeWidth = vectorObjectStrokeWidth(object)
  const opacity = vectorObjectOpacity(object)
  const dash = vectorObjectDash(object)

  function applyHex(kind: "fill" | "stroke", value: string) {
    const hex = normalizeHex(value)
    if (!hex || !object) return
    onChange(patchVectorObjectStyle(object, { [kind]: hex }))
  }

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-ui font-medium">Style</h3>
      {fill !== null ? (
        <div className="space-y-1.5">
          <Label htmlFor="vector-fill-hex">Fill HEX</Label>
          <Input
            id="vector-fill-hex"
            className="font-mono tabular-nums"
            defaultValue={fill}
            key={`fill-${object.id}-${fill}`}
            onBlur={(event) => applyHex("fill", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyHex("fill", event.currentTarget.value)
            }}
            aria-invalid={fill ? undefined : true}
          />
        </div>
      ) : null}
      {stroke !== null ? (
        <div className="space-y-1.5">
          <Label htmlFor="vector-stroke-hex">Stroke HEX</Label>
          <Input
            id="vector-stroke-hex"
            className="font-mono tabular-nums"
            defaultValue={stroke}
            key={`stroke-${object.id}-${stroke}`}
            onBlur={(event) => applyHex("stroke", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyHex("stroke", event.currentTarget.value)
            }}
          />
        </div>
      ) : null}
      {strokeWidth !== null ? (
        <div className="space-y-1.5">
          <Label htmlFor="vector-stroke-width">Stroke width</Label>
          <Input
            id="vector-stroke-width"
            type="number"
            min={0.5}
            max={24}
            step={0.5}
            className="tabular-nums"
            value={strokeWidth}
            onChange={(event) =>
              onChange(
                patchVectorObjectStyle(object, {
                  strokeWidth: Number(event.target.value),
                })
              )
            }
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="vector-dash">Dash</Label>
        <Input
          id="vector-dash"
          type="number"
          min={0}
          max={48}
          step={1}
          className="tabular-nums"
          value={dash}
          onChange={(event) =>
            onChange(patchVectorObjectStyle(object, { dash: Number(event.target.value) || 0 }))
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vector-opacity">Opacity</Label>
        <Input
          id="vector-opacity"
          type="number"
          min={0}
          max={1}
          step={0.05}
          className="tabular-nums"
          value={opacity}
          onChange={(event) =>
            onChange(patchVectorObjectStyle(object, { opacity: Number(event.target.value) }))
          }
        />
      </div>
      {fill !== null || stroke !== null ? (
        <p className="text-caption text-hollow">
          Use a 3- or 6-digit hex value. Invalid values are ignored.
        </p>
      ) : null}
    </div>
  )
}
