"use client"

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react"
import {
  CircleIcon,
  FileImageIcon,
  FileType2Icon,
  FrameIcon,
  ImageAddIcon,
  LineIcon,
  Loader2Icon,
  MessageSquareIcon,
  MousePointer2Icon,
  PencilIcon,
  Redo2Icon,
  SelectRegionIcon,
  ShapesIcon,
  Trash2Icon,
  TypeIcon,
  Undo2Icon,
} from "@/components/icons"
import { toast } from "sonner"

import { Button } from "@/components/align/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/align/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/align/tooltip"
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
import { Textarea } from "@/components/align/textarea"
import { createIllustrationJpeg, createIllustrationPng } from "@/lib/illustration/export"
import { renderIllustrationSvg, type IllustrationComment } from "@/lib/illustration/overlay"
import { useIllustrationCanvasStore } from "@/lib/illustration/store"
import { createDrawnVectorObject } from "@/lib/vector-canvas/create-shape"
import { vectorImageFromFile } from "@/lib/vector-canvas/image-object"
import { appendStrokePoint, strokeToPath } from "@/lib/vector-canvas/pencil"
import { downloadArtifact, exportFilename } from "@/lib/flowchart/export"
import { regionRedrawPrompt, type EditRegion } from "@/lib/product/image-edit"
import {
  hitTestTopVectorObject,
  moveVectorObjects,
  vectorObjectBounds,
  vectorObjectLabel,
} from "@/lib/vector-canvas/objects"
import { createVectorDocumentId, VECTOR_INK, type VectorObject } from "@/lib/vector-canvas/schema"
import {
  normalizeRect,
  objectsInRect,
  toggleSelectedIds,
  unionSelectedIds,
} from "@/lib/vector-canvas/selection"
import { cn } from "@/lib/utils"

type Tool = "select" | "text" | "rect" | "frame" | "line" | "ellipse" | "region" | "pencil" | "comment"

const COMMENT_HIT = 14

function hitComment(
  comments: IllustrationComment[],
  x: number,
  y: number
): IllustrationComment | null {
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    const comment = comments[index]
    if (comment && Math.hypot(x - comment.x, y - comment.y) <= COMMENT_HIT) return comment
  }
  return null
}

type IllustrationCanvasProps = {
  projectId: string
  assetId: string
  dataUrl: string
  title: string
  busy?: boolean
  onRunEdit?: (prompt: string) => void
}

export function IllustrationCanvas({
  projectId,
  assetId,
  dataUrl,
  title,
  busy = false,
  onRunEdit,
}: IllustrationCanvasProps) {
  const objects = useIllustrationCanvasStore((state) => state.objects)
  const comments = useIllustrationCanvasStore((state) => state.comments)
  const page = useIllustrationCanvasStore((state) => state.page)
  const past = useIllustrationCanvasStore((state) => state.past)
  const future = useIllustrationCanvasStore((state) => state.future)
  const announcement = useIllustrationCanvasStore((state) => state.announcement)
  const hydrate = useIllustrationCanvasStore((state) => state.hydrate)
  const commit = useIllustrationCanvasStore((state) => state.commit)
  const undo = useIllustrationCanvasStore((state) => state.undo)
  const redo = useIllustrationCanvasStore((state) => state.redo)

  const [tool, setTool] = useState<Tool>("select")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 16, y: 16 })
  const [textDraft, setTextDraft] = useState("")
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const imageInput = useRef<HTMLInputElement>(null)
  const [linePreview, setLinePreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const [rectPreview, setRectPreview] = useState<{
    x: number
    y: number
    width: number
    height: number
    circle?: boolean
  } | null>(null)
  const [region, setRegion] = useState<EditRegion | null>(null)
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)
  const [regionInstruction, setRegionInstruction] = useState("")
  const [pendingComment, setPendingComment] = useState<{ x: number; y: number } | null>(null)
  const [commentDraft, setCommentDraft] = useState("")
  const [strokePreview, setStrokePreview] = useState<Array<{ x: number; y: number }>>([])
  const [exporting, setExporting] = useState<"png" | "svg" | "jpg" | null>(null)
  const [dragOffset, setDragOffset] = useState<{ ids: string[]; dx: number; dy: number } | null>(null)
  const [commentDrag, setCommentDrag] = useState<{ id: string; dx: number; dy: number } | null>(null)
  const [naturalSize, setNaturalSize] = useState({ width: 1280, height: 720 })
  const viewportRef = useRef<HTMLDivElement>(null)
  const fittedFor = useRef<string | null>(null)

  const drag = useRef<{
    kind: "pan" | "draw" | "move" | "region" | "pencil" | "comment" | "box" | "line"
    startX: number
    startY: number
    originX: number
    originY: number
    objectId?: string
    additive?: boolean
    shift?: boolean
  } | null>(null)

  useEffect(() => {
    hydrate({
      projectId,
      assetId,
      width: naturalSize.width,
      height: naturalSize.height,
    })
  }, [assetId, hydrate, naturalSize.height, naturalSize.width, projectId])

  useEffect(() => {
    const key = `${assetId}:${page.width}x${page.height}`
    const el = viewportRef.current
    if (!el || page.width <= 0 || page.height <= 0) return
    if (fittedFor.current === key) return
    const width = el.clientWidth
    const height = el.clientHeight
    if (width < 80 || height < 80) return
    const next = Math.min(1, (width - 32) / page.width, (height - 32) / page.height)
    const zoomValue = Number(Math.max(0.15, next).toFixed(2))
    setZoom(zoomValue)
    setPan({
      x: Math.max(8, (width - page.width * zoomValue) / 2),
      y: Math.max(8, (height - page.height * zoomValue) / 2),
    })
    fittedFor.current = key
  }, [assetId, page.height, page.width])

  const displayObjects = useMemo(() => {
    if (!dragOffset) return objects
    return moveVectorObjects(objects, dragOffset.ids, dragOffset.dx, dragOffset.dy)
  }, [dragOffset, objects])

  const displayComments = useMemo(() => {
    if (!commentDrag) return comments
    return comments.map((comment) =>
      comment.id === commentDrag.id
        ? { ...comment, x: comment.x + commentDrag.dx, y: comment.y + commentDrag.dy }
        : comment
    )
  }, [commentDrag, comments])

  function canvasPoint(event: { clientX: number; clientY: number }, bounds: DOMRect) {
    return {
      x: (event.clientX - bounds.left - pan.x) / zoom,
      y: (event.clientY - bounds.top - pan.y) / zoom,
    }
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (busy || pendingText || pendingComment) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const point = canvasPoint(event, bounds)
    const additive = event.shiftKey

    if (tool === "text") {
      setPendingText(point)
      setTextDraft("")
      return
    }

    if (tool === "comment") {
      const existing = hitComment(displayComments, point.x, point.y)
      if (existing) {
        setSelectedCommentId(existing.id)
        setSelectedIds([])
        return
      }
      setPendingComment(point)
      setCommentDraft("")
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

    if (tool === "rect" || tool === "frame" || tool === "ellipse" || tool === "region") {
      drag.current = {
        kind: tool === "region" ? "region" : "draw",
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

    const pin = hitComment(displayComments, point.x, point.y)
    if (pin) {
      setSelectedCommentId(pin.id)
      setSelectedIds([])
      drag.current = {
        kind: "comment",
        startX: point.x,
        startY: point.y,
        originX: pin.x,
        originY: pin.y,
        objectId: pin.id,
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
      setSelectedCommentId(null)
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

    if (!additive) setSelectedIds([])
    setSelectedCommentId(null)
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

    if (drag.current.kind === "line") {
      setLinePreview({
        x1: drag.current.originX,
        y1: drag.current.originY,
        x2: point.x,
        y2: point.y,
      })
      return
    }

    if (drag.current.kind === "comment" && drag.current.objectId) {
      setCommentDrag({
        id: drag.current.objectId,
        dx: point.x - drag.current.startX,
        dy: point.y - drag.current.startY,
      })
      return
    }

    if (drag.current.kind === "pencil") {
      setStrokePreview((current) => appendStrokePoint(current, point))
      return
    }

    const circle = tool === "ellipse" && (event.shiftKey || drag.current.shift)
    setRectPreview({
      ...normalizeRect({ x: drag.current.originX, y: drag.current.originY }, point),
      circle,
    })
  }

  function onPointerUp() {
    const current = drag.current
    drag.current = null

    if (current?.kind === "move" && dragOffset) {
      commit(
        {
          objects: moveVectorObjects(objects, dragOffset.ids, dragOffset.dx, dragOffset.dy),
        },
        dragOffset.ids.length > 1 ? "Moved objects" : "Moved object"
      )
      setDragOffset(null)
      return
    }

    if (current?.kind === "comment" && commentDrag) {
      commit(
        {
          comments: comments.map((comment) =>
            comment.id === commentDrag.id
              ? { ...comment, x: comment.x + commentDrag.dx, y: comment.y + commentDrag.dy }
              : comment
          ),
        },
        "Moved comment"
      )
      setCommentDrag(null)
      return
    }

    if (current?.kind === "pencil") {
      const points = strokePreview
      setStrokePreview([])
      if (points.length >= 2) {
        const nextObject: VectorObject = {
          id: createVectorDocumentId(),
          type: "pencil",
          points,
          stroke: VECTOR_INK,
          strokeWidth: 2,
        }
        commit({ objects: [...objects, nextObject] }, "Pencil stroke added")
        setSelectedIds([nextObject.id])
        setSelectedCommentId(null)
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
        commit({ objects: [...objects, next] }, "Line added")
        setSelectedIds([next.id])
        toast.success("Line added")
      }
      return
    }

    if (current?.kind === "box") {
      const hits = rectPreview ? objectsInRect(displayObjects, rectPreview).map((object) => object.id) : []
      setSelectedIds((currentIds) => (current.additive ? unionSelectedIds(currentIds, hits) : hits))
      setRectPreview(null)
      return
    }

    if (!current || !rectPreview || rectPreview.width < 8 || rectPreview.height < 8) {
      setRectPreview(null)
      return
    }

    if (current.kind === "region") {
      setRegion({
        x: Math.min(1, Math.max(0, rectPreview.x / page.width)),
        y: Math.min(1, Math.max(0, rectPreview.y / page.height)),
        width: Math.min(1, Math.max(0, rectPreview.width / page.width)),
        height: Math.min(1, Math.max(0, rectPreview.height / page.height)),
      })
      setRegionDialogOpen(true)
      setRectPreview(null)
      return
    }

    if (tool !== "rect" && tool !== "frame" && tool !== "ellipse") {
      setRectPreview(null)
      return
    }
    const nextObject = createDrawnVectorObject({
      tool,
      start: { x: current.originX, y: current.originY },
      end: {
        x: current.originX + (rectPreview.x < current.originX ? -rectPreview.width : rectPreview.width),
        y: current.originY + (rectPreview.y < current.originY ? -rectPreview.height : rectPreview.height),
      },
      circle: Boolean(rectPreview.circle),
    })
    if (!nextObject) {
      setRectPreview(null)
      return
    }
    const label = tool === "frame" ? "Frame added" : tool === "ellipse" ? "Ellipse added" : "Rectangle added"
    commit({ objects: [...objects, nextObject] }, label)
    setSelectedIds([nextObject.id])
    setRectPreview(null)
    toast.success(label)
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    const next = Math.min(4, Math.max(0.25, zoom * (event.deltaY > 0 ? 0.9 : 1.1)))
    setZoom(Number(next.toFixed(2)))
  }

  function placeText() {
    if (!pendingText || !textDraft.trim()) return
    const nextObject: VectorObject = {
      id: createVectorDocumentId(),
      type: "text",
      x: pendingText.x,
      y: pendingText.y,
      text: textDraft.trim(),
      fill: VECTOR_INK,
      fontSize: 18,
    }
    commit({ objects: [...objects, nextObject] }, "Text added")
    setSelectedIds([nextObject.id])
    setPendingText(null)
    setTextDraft("")
    toast.success("Text added")
  }

  function placeComment() {
    if (!pendingComment || !commentDraft.trim()) return
    const next: IllustrationComment = {
      id: createVectorDocumentId(),
      x: pendingComment.x,
      y: pendingComment.y,
      text: commentDraft.trim(),
      createdAt: new Date().toISOString(),
    }
    commit({ comments: [...comments, next] }, "Comment added")
    setSelectedCommentId(next.id)
    setSelectedIds([])
    setPendingComment(null)
    setCommentDraft("")
    toast.success("Comment added")
  }

  function removeSelected() {
    if (selectedCommentId) {
      commit(
        { comments: comments.filter((comment) => comment.id !== selectedCommentId) },
        "Removed comment"
      )
      setSelectedCommentId(null)
      return
    }
    if (selectedIds.length === 0) return
    commit(
      { objects: objects.filter((object) => !selectedIds.includes(object.id)) },
      selectedIds.length > 1 ? "Removed objects" : "Removed object"
    )
    setSelectedIds([])
  }

  async function exportSvg() {
    setExporting("svg")
    try {
      const svg = renderIllustrationSvg({
        title,
        imageHref: dataUrl,
        page,
        objects: displayObjects,
      })
      downloadArtifact(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
        exportFilename(title || "figure", "svg")
      )
      toast.success("SVG downloaded", {
        description: "The illustration plus your text and shapes.",
      })
    } finally {
      setExporting(null)
    }
  }

  async function exportJpg() {
    setExporting("jpg")
    try {
      const artifact = await createIllustrationJpeg({
        title,
        imageHref: dataUrl,
        page,
        objects: displayObjects,
      })
      downloadArtifact(artifact, exportFilename(title || "figure", "jpg"))
      toast.success("JPG downloaded")
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "The browser could not create this JPG.",
      })
    } finally {
      setExporting(null)
    }
  }

  async function exportPng() {
    setExporting("png")
    try {
      const artifact = await createIllustrationPng({
        title,
        imageHref: dataUrl,
        page,
        objects: displayObjects,
      })
      downloadArtifact(artifact, exportFilename(title || "figure", "png"))
      toast.success("PNG downloaded")
    } catch (error) {
      toast.error("Export failed", {
        description: error instanceof Error ? error.message : "The browser could not create this PNG.",
      })
    } finally {
      setExporting(null)
    }
  }

  function submitRegion() {
    if (!region || !regionInstruction.trim() || !onRunEdit) return
    onRunEdit(regionRedrawPrompt(region, regionInstruction))
    setRegionDialogOpen(false)
    setRegionInstruction("")
    setRegion(null)
    setTool("select")
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      const command = event.metaKey || event.ctrlKey
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault()
        if (event.shiftKey) useIllustrationCanvasStore.getState().redo()
        else useIllustrationCanvasStore.getState().undo()
        return
      }
      if (event.code === "Space") {
        event.preventDefault()
        setSpaceHeld(true)
      }
      if ((event.key === "Delete" || event.key === "Backspace") && (selectedIds.length > 0 || selectedCommentId)) {
        event.preventDefault()
        const current = useIllustrationCanvasStore.getState()
        if (selectedCommentId) {
          current.commit(
            { comments: current.comments.filter((comment) => comment.id !== selectedCommentId) },
            "Removed comment"
          )
          setSelectedCommentId(null)
        } else if (selectedIds.length > 0) {
          current.commit(
            { objects: current.objects.filter((object) => !selectedIds.includes(object.id)) },
            selectedIds.length > 1 ? "Removed objects" : "Removed object"
          )
          setSelectedIds([])
        }
      }
      if (event.key === "Escape") {
        setPendingText(null)
        setPendingComment(null)
        setSelectedIds([])
        setSelectedCommentId(null)
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
  }, [selectedCommentId, selectedIds])

  const tools = [
    { id: "select" as const, label: "Select", icon: MousePointer2Icon },
    { id: "text" as const, label: "Text", icon: TypeIcon },
    { id: "rect" as const, label: "Rectangle", icon: ShapesIcon },
    { id: "ellipse" as const, label: "Ellipse", icon: CircleIcon },
    { id: "line" as const, label: "Line", icon: LineIcon },
    { id: "frame" as const, label: "Frame", icon: FrameIcon },
    { id: "pencil" as const, label: "Pencil", icon: PencilIcon },
    { id: "comment" as const, label: "Comment", icon: MessageSquareIcon },
  ]

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2 py-2" role="toolbar" aria-label="Illustration canvas">
        <ToggleGroup
          type="single"
          value={tool}
          onValueChange={(value) => {
            if (!value) return
            setTool(value as Tool)
            setPendingText(null)
          }}
          spacing={1}
          size="sm"
          disabled={busy}
          aria-label="Illustration tools"
        >
          {tools.map((item) => {
            const Icon = item.icon
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value={item.id} aria-label={item.label} className="size-8 px-0">
                    <Icon aria-hidden="true" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
          {onRunEdit ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem value="region" aria-label="Region" className="size-8 px-0">
                  <SelectRegionIcon aria-hidden="true" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent>Region</TooltipContent>
            </Tooltip>
          ) : null}
        </ToggleGroup>
        <span className="h-5 w-px bg-border" aria-hidden="true" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              aria-label="Add image"
              onClick={() => imageInput.current?.click()}
            >
              <ImageAddIcon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add image</TooltipContent>
        </Tooltip>
        <input
          ref={imageInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          aria-label="Upload an image onto the canvas"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            void (async () => {
              try {
                const next = await vectorImageFromFile(file, {
                  x: Math.max(16, page.width * 0.08),
                  y: Math.max(16, page.height * 0.08),
                })
                commit({ objects: [...objects, next] }, "Image added")
                setSelectedIds([next.id])
                toast.success("Image added")
              } catch (error) {
                toast.error("Image could not be added", {
                  description:
                    error instanceof Error ? error.message : "Choose a smaller PNG, JPEG, WebP, or GIF.",
                })
              }
            })()
          }}
        />
        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          title="Undo"
          disabled={past.length === 0 || busy}
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
          disabled={future.length === 0 || busy}
          onClick={redo}
        >
          <Redo2Icon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={(selectedIds.length === 0 && !selectedCommentId) || busy}
          onClick={removeSelected}
        >
          <Trash2Icon aria-hidden="true" />
          Remove
        </Button>
        <div className="ms-auto flex flex-wrap items-center gap-1">
          <Button type="button" variant="outline" size="sm" disabled={Boolean(exporting)} onClick={() => void exportSvg()}>
            {exporting === "svg" ? (
              <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <FileType2Icon aria-hidden="true" />
            )}
            SVG
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={Boolean(exporting)} onClick={() => void exportPng()}>
            {exporting === "png" ? (
              <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <FileImageIcon aria-hidden="true" />
            )}
            PNG
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={Boolean(exporting)} onClick={() => void exportJpg()}>
            {exporting === "jpg" ? (
              <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <FileImageIcon aria-hidden="true" />
            )}
            JPG
          </Button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "relative min-h-[280px] min-w-0 flex-1 overflow-hidden bg-muted",
          tool === "text" || tool === "comment"
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
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={title}
            width={page.width}
            height={page.height}
            className="image-outline block max-w-none select-none"
            draggable={false}
            onLoad={(event) => {
              const width = event.currentTarget.naturalWidth
              const height = event.currentTarget.naturalHeight
              if (width > 0 && height > 0) setNaturalSize({ width, height })
            }}
          />
          <svg
            className="pointer-events-none absolute inset-0"
            width={page.width}
            height={page.height}
            viewBox={`0 0 ${page.width} ${page.height}`}
            aria-hidden="true"
          >
            {displayObjects.map((object) => {
              const selected = selectedIds.includes(object.id)
              if (object.type === "rect") {
                return (
                  <rect
                    key={object.id}
                    x={object.x}
                    y={object.y}
                    width={object.width}
                    height={object.height}
                    fill={object.fill}
                    opacity={0.88}
                    stroke={selected ? "currentColor" : "none"}
                    strokeWidth={selected ? 2 / zoom : 0}
                  />
                )
              }
              if (object.type === "frame") {
                return (
                  <rect
                    key={object.id}
                    x={object.x}
                    y={object.y}
                    width={object.width}
                    height={object.height}
                    fill="none"
                    stroke={object.stroke}
                    strokeWidth={selected ? 3 : 2}
                  />
                )
              }
              if (object.type === "ellipse") {
                return (
                  <ellipse
                    key={object.id}
                    cx={object.x + object.width / 2}
                    cy={object.y + object.height / 2}
                    rx={object.width / 2}
                    ry={object.height / 2}
                    fill="none"
                    stroke={object.stroke}
                    strokeWidth={selected ? 3 : 2}
                  />
                )
              }
              if (object.type === "line") {
                return (
                  <line
                    key={object.id}
                    x1={object.x1}
                    y1={object.y1}
                    x2={object.x2}
                    y2={object.y2}
                    stroke={object.stroke}
                    strokeWidth={selected ? object.strokeWidth + 1 : object.strokeWidth}
                    strokeLinecap="round"
                  />
                )
              }
              if (object.type === "image") {
                return (
                  <image
                    key={object.id}
                    href={object.href}
                    x={object.x}
                    y={object.y}
                    width={object.width}
                    height={object.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )
              }
              if (object.type === "pencil") {
                return (
                  <path
                    key={object.id}
                    d={strokeToPath(object.points)}
                    fill="none"
                    stroke={object.stroke}
                    strokeWidth={selected ? object.strokeWidth + 1 : object.strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )
              }
              return (
                <text
                  key={object.id}
                  x={object.x}
                  y={object.y}
                  fill={object.fill}
                  fontSize={object.fontSize}
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
                  stroke={selected ? "currentColor" : "none"}
                  strokeWidth={selected ? 0.6 : 0}
                >
                  {object.text}
                </text>
              )
            })}
            {selectedIds.map((id) => {
              const object = displayObjects.find((item) => item.id === id)
              if (!object) return null
              const bounds = vectorObjectBounds(object)
              return (
                <rect
                  key={`sel-${id}`}
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
            {displayComments.map((comment, index) => {
              const selected = selectedCommentId === comment.id
              return (
                <g key={comment.id}>
                  <circle
                    cx={comment.x}
                    cy={comment.y}
                    r={11}
                    fill="currentColor"
                    opacity={selected ? 1 : 0.92}
                  />
                  <text
                    x={comment.x}
                    y={comment.y + 4}
                    textAnchor="middle"
                    fill="var(--background)"
                    fontSize={11}
                    fontWeight={600}
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
                  >
                    {index + 1}
                  </text>
                </g>
              )
            })}
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
                  fill={tool === "rect" ? "currentColor" : "none"}
                  opacity={tool === "rect" ? 0.12 : tool === "select" ? 0.08 : 1}
                  stroke="currentColor"
                  strokeWidth={tool === "select" ? 1 : 2}
                  strokeDasharray={tool === "select" ? "4 3" : undefined}
                />
              )
            ) : null}
          </svg>
        </div>
        <p className="pointer-events-none absolute inset-x-3 bottom-3 text-caption text-hollow tabular-nums">
          {Math.round(zoom * 100)}% · scroll to zoom ·{" "}
          {tool === "select"
            ? "drag a box to select · Shift-click to add · hold Space to pan"
            : tool === "text"
              ? "click to place text"
              : tool === "comment"
                ? "click to pin a comment"
                : tool === "pencil"
                  ? "drag to draw a freehand stroke"
                  : tool === "line"
                    ? "drag to draw a line"
                    : tool === "ellipse"
                      ? "drag to draw an ellipse · hold Shift for a circle"
                      : tool === "region"
                        ? "drag a region for an AI redraw"
                        : "drag to draw"}
        </p>
      </div>

      {displayObjects.length > 0 || displayComments.length > 0 ? (
        <div className="space-y-2 border-t border-border/70 px-2 py-2">
          {displayObjects.length > 0 ? (
            <ul className="flex flex-wrap gap-1">
              {displayObjects.map((object) => (
                <li key={object.id}>
                  <button
                    type="button"
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-caption outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50",
                      selectedIds.includes(object.id) && "bg-hover-veil"
                    )}
                    onClick={(event) => {
                      setSelectedIds((current) =>
                        event.shiftKey ? toggleSelectedIds(current, object.id) : [object.id]
                      )
                      setSelectedCommentId(null)
                    }}
                  >
                    {vectorObjectLabel(object)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {displayComments.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {displayComments.map((comment, index) => (
                <li key={comment.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2.5 py-1.5 text-left text-caption outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50",
                      selectedCommentId === comment.id && "bg-hover-veil"
                    )}
                    onClick={() => {
                      setSelectedCommentId(comment.id)
                      setSelectedIds([])
                    }}
                  >
                    <span className="font-medium tabular-nums">{index + 1}</span>
                    <span className="min-w-0 flex-1">{comment.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      {pendingComment ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-background p-4">
            <div className="space-y-2">
              <Label htmlFor="illustration-comment">Comment</Label>
              <Textarea
                id="illustration-comment"
                rows={3}
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="What should change here?"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    placeComment()
                  }
                  if (event.key === "Escape") setPendingComment(null)
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPendingComment(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={!commentDraft.trim()} onClick={placeComment}>
                Pin comment
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingText ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-overlay p-4">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-background p-4">
            <div className="space-y-2">
              <Label htmlFor="illustration-text">Text</Label>
              <Input
                id="illustration-text"
                value={textDraft}
                onChange={(event) => setTextDraft(event.target.value)}
                placeholder="Label this region"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    placeText()
                  }
                  if (event.key === "Escape") setPendingText(null)
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPendingText(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={!textDraft.trim()} onClick={placeText}>
                Place text
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={regionDialogOpen}
        onOpenChange={(next) => {
          setRegionDialogOpen(next)
          if (!next) setRegion(null)
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Redraw this region</DialogTitle>
            <DialogDescription>
              Describe what should change inside the marked area of {title}. Canvas marks stay until
              you remove them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="illustration-region" className="sr-only">
              Region instruction
            </Label>
            <Textarea
              id="illustration-region"
              rows={3}
              value={regionInstruction}
              onChange={(event) => setRegionInstruction(event.target.value)}
              placeholder="e.g. Replace the icon with a microscope, keep the label"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" disabled={!regionInstruction.trim()} onClick={submitRegion}>
              Redraw region
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
