"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowUpRightIcon,
  DownloadIcon,
  ImageIcon,
  Loader2Icon,
  ShapesIcon,
} from "@/components/icons"
import { toast } from "sonner"

import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogIcon,
  DialogTitle,
  DialogTrigger,
} from "@/components/align/dialog"
import { Label } from "@/components/align/label"
import { RadioGroup, RadioGroupItem } from "@/components/align/radio-group"
import { ApiRequestError, postJson } from "@/lib/api/client"
import { downloadArtifact, exportFilename } from "@/lib/flowchart/export"
import { dataUrlToInline } from "@/lib/product/attachments"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import { svgMarkupFromDataUrl } from "@/lib/vector-canvas/from-svg"
import { useVectorCanvasStore } from "@/lib/vector-canvas/store"
import {
  VECTORIZE_DETAILS,
  VECTORIZE_DETAIL_LABELS,
  VECTORIZE_INKS,
  type VectorizeDetail,
  type VectorizeInkId,
  type VectorizeResponse,
} from "@/lib/vectorize/options"
import { cn } from "@/lib/utils"

type VectorizeDialogProps = {
  image: { dataUrl: string; mimeType: string; label: string }
}

export function VectorizeDialog({ image }: VectorizeDialogProps) {
  const router = useRouter()
  const addGeneratedImage = useWorkspaceStore((state) => state.addGeneratedImage)
  const createFromSvg = useVectorCanvasStore((state) => state.createFromSvg)

  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<VectorizeDetail>("balanced")
  const [ink, setInk] = useState<VectorizeInkId>("graphite")
  const [running, setRunning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<(VectorizeResponse & { dataUrl: string }) | null>(null)

  const alreadyVector = image.mimeType.includes("svg")

  async function trace() {
    const inline = dataUrlToInline(image.dataUrl)
    if (!inline) {
      setError("The source image could not be read.")
      return
    }
    setRunning(true)
    setError(null)
    try {
      const traced = await postJson<VectorizeResponse>("/api/vectorize", {
        image: { mimeType: inline.mimeType, data: inline.data },
        detail,
        inkColor: VECTORIZE_INKS.find((item) => item.id === ink)?.color,
      })
      setResult({
        ...traced,
        dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(traced.svg)}`,
      })
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The image could not be traced. Try again."
      )
    } finally {
      setRunning(false)
    }
  }

  function download() {
    if (!result) return
    downloadArtifact(
      new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }),
      exportFilename(`${image.label} vector`, "svg")
    )
    toast.success("SVG downloaded")
  }

  async function saveToLibrary() {
    if (!result) return
    setSaving(true)
    try {
      await addGeneratedImage({
        prompt: `Vectorized: ${image.label}`,
        mimeType: "image/svg+xml",
        dataUrl: result.dataUrl,
        projectId: null,
      })
      toast.success("Saved to library")
    } catch {
      toast.error("The vector could not be saved to the library.")
    } finally {
      setSaving(false)
    }
  }

  async function openSvgDocument(svg: string) {
    setSaving(true)
    setError(null)
    try {
      const created = await createFromSvg({
        svg,
        title: `${image.label} (vector)`.slice(0, 80),
      })
      setOpen(false)
      router.push(`/vector-canvas/${created.id}`)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The vector document could not be created."
      )
      toast.error("The vector document could not be created.")
    } finally {
      setSaving(false)
    }
  }

  async function openAsVectorDocument() {
    if (!result) return
    await openSvgDocument(result.svg)
  }

  async function openExistingSvg() {
    const svg = svgMarkupFromDataUrl(image.dataUrl)
    if (!svg) {
      setError("The SVG could not be read.")
      return
    }
    await openSvgDocument(svg)
  }

  function downloadExistingSvg() {
    const svg = svgMarkupFromDataUrl(image.dataUrl)
    if (!svg) {
      toast.error("The SVG could not be read.")
      return
    }
    downloadArtifact(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      exportFilename(image.label, "svg")
    )
    toast.success("SVG downloaded")
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setError(null)
          setResult(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ShapesIcon aria-hidden="true" />
          Vectorize
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogIcon>
            <ShapesIcon aria-hidden="true" />
          </DialogIcon>
          <DialogTitle>Vectorize image</DialogTitle>
          <DialogDescription>
            Trace the raster figure into scalable SVG paths on the server.
          </DialogDescription>
        </DialogHeader>

        {alreadyVector ? (
          <div className="space-y-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.dataUrl}
              alt={image.label}
              className="image-outline max-h-32 w-auto rounded-lg bg-sidebar"
            />
            <p className="text-meta text-muted-foreground">
              This figure is already SVG. Open it as an editable vector document, or download the file.
            </p>
            {error ? (
              <p className="text-meta text-muted-foreground" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={saving} onClick={() => void openExistingSvg()}>
                <ArrowUpRightIcon aria-hidden="true" />
                Open in Vector canvas
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadExistingSvg}>
                <DownloadIcon aria-hidden="true" />
                Download SVG
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.dataUrl}
                alt={image.label}
                className="image-outline max-h-32 w-auto rounded-lg bg-sidebar"
              />
              <p className="text-caption text-muted-foreground">
                The trace keeps one ink color and drops shading. Low-contrast photos get a
                contrast, threshold, and invert pass first. Flat shapes still convert best.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label id="vectorize-detail-label">Detail</Label>
                <RadioGroup
                  aria-labelledby="vectorize-detail-label"
                  value={detail}
                  onValueChange={(value) => setDetail(value as VectorizeDetail)}
                >
                  {VECTORIZE_DETAILS.map((value) => (
                    <Label
                      key={value}
                      htmlFor={`vectorize-detail-${value}`}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 p-3 has-data-checked:border-ring has-data-checked:bg-muted"
                    >
                      <span className="flex items-center gap-3">
                        <RadioGroupItem id={`vectorize-detail-${value}`} value={value} />
                        {VECTORIZE_DETAIL_LABELS[value].label}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {VECTORIZE_DETAIL_LABELS[value].hint}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label id="vectorize-ink-label">Ink</Label>
                <div
                  role="radiogroup"
                  aria-labelledby="vectorize-ink-label"
                  className="flex flex-wrap gap-2"
                >
                  {VECTORIZE_INKS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={ink === item.id}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => setInk(item.id)}
                      className={cn(
                        "size-9 rounded-lg border outline-none motion-safe:transition-[border-color,scale] motion-safe:duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]",
                        ink === item.id ? "border-foreground" : "border-border/70"
                      )}
                      style={{ backgroundColor: item.color }}
                    />
                  ))}
                </div>
                <p className="text-caption text-hollow">Applied to every traced path.</p>
              </div>
            </div>

            {error ? (
              <p className="text-meta text-muted-foreground" role="alert">
                {error}
              </p>
            ) : null}

            {result ? (
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.dataUrl}
                  alt={`Traced vector preview of ${image.label}`}
                  className="image-outline max-h-64 w-full rounded-lg bg-sidebar object-contain"
                />
                <p className="text-caption text-hollow tabular-nums">
                  {result.pathCount} paths · {result.width} × {result.height}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={download}>
                    <DownloadIcon aria-hidden="true" />
                    Download SVG
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => void saveToLibrary()}
                  >
                    <ImageIcon aria-hidden="true" />
                    Save to library
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => void openAsVectorDocument()}
                  >
                    <ArrowUpRightIcon aria-hidden="true" />
                    Open in Vector canvas
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button type="button" onClick={() => void trace()} disabled={running}>
                  {running ? (
                    <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <ShapesIcon aria-hidden="true" />
                  )}
                  {running ? "Tracing…" : "Trace to SVG"}
                </Button>
              </div>
            )}

            {result ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={running}
                  onClick={() => void trace()}
                >
                  {running ? (
                    <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : null}
                  Trace again
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
