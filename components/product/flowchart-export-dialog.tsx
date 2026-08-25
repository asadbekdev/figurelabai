"use client"

import { useMemo, useState } from "react"
import {
  CircleCheckIcon,
  DownloadIcon,
  FileImageIcon,
  FileTextIcon,
  FileType2Icon,
  Loader2Icon,
  TriangleAlertIcon,
} from "@/components/icons"
import { toast } from "sonner"

import { Badge } from "@/components/align/badge"
import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/align/dialog"
import { Label } from "@/components/align/label"
import { RadioGroup, RadioGroupItem } from "@/components/align/radio-group"
import { ScrollArea } from "@/components/align/scroll-area"
import { Separator } from "@/components/align/divider"
import {
  createFlowchartJpg,
  createFlowchartPng,
  createFlowchartSvg,
  downloadArtifact,
  exportFilename,
  validateFlowchartSvg,
} from "@/lib/flowchart/export"
import { createPublicationRecordPdf } from "@/lib/export/certificate"
import { createFlowchartPdf } from "@/lib/export/pdf"
import { createFlowchartPptx } from "@/lib/export/pptx"
import { runFlowchartReadiness } from "@/lib/flowchart/readiness"
import { useFlowchartEditorStore } from "@/lib/flowchart/store"
import { useProjectSessionStore } from "@/lib/product/project-session"
import { flushProjectSave } from "@/lib/product/use-project-persistence"

type ExportFormat = "svg" | "png" | "jpg" | "pdf" | "pptx" | "json" | "certificate"
type ExportBackground = "document" | "transparent"
type ExportScale = 1 | 2 | 4

function FormatOption({
  id,
  value,
  title,
  description,
  icon,
}: {
  id: string
  value: ExportFormat
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <Label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 p-3 has-data-checked:border-ring has-data-checked:bg-muted"
    >
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="block text-caption font-normal text-muted-foreground">
          {description}
        </span>
      </span>
    </Label>
  )
}

export function FlowchartExportDialog() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const document = useFlowchartEditorStore((state) => state.document)
  const selectNodes = useFlowchartEditorStore((state) => state.selectNodes)
  const selectEdge = useFlowchartEditorStore((state) => state.selectEdge)
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ExportFormat>("svg")
  const [background, setBackground] =
    useState<ExportBackground>("document")
  const [scale, setScale] = useState<ExportScale>(2)
  const [exporting, setExporting] = useState(false)
  const report = useMemo(() => runFlowchartReadiness(document), [document])

  const focusIssue = (nodeIds: string[], edgeIds: string[]) => {
    if (nodeIds.length > 0) selectNodes(nodeIds)
    else if (edgeIds[0]) selectEdge(edgeIds[0])
    setOpen(false)
    window.setTimeout(() => {
      const objectId = nodeIds[0] ?? edgeIds[0]
      if (!objectId) return
      window.document
        .querySelector<HTMLElement>(
          `[data-id="${CSS.escape(objectId)}"], [data-object-id="${CSS.escape(
            objectId
          )}"]`
        )
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  const exportArtifact = async () => {
    if (format !== "json" && format !== "certificate" && !report.ready) return
    setExporting(true)

    try {
      await flushProjectSave()
      if (useProjectSessionStore.getState().saveState === "conflict") {
        throw new Error("Resolve the save conflict before exporting this revision.")
      }

      if (format === "certificate") {
        const artifact = await createPublicationRecordPdf({
          title: document.metadata.title,
          projectId: projectId || "local-unsaved",
          figureKind: "flowchart",
        })
        downloadArtifact(artifact, exportFilename(`${document.metadata.title}-publication-record`, "pdf"))
      } else if (format === "json") {
        const artifact = new Blob([JSON.stringify(document, null, 2)], {
          type: "application/json;charset=utf-8",
        })
        downloadArtifact(artifact, exportFilename(document.metadata.title, "json"))
      } else if (format === "pptx") {
        const artifact = await createFlowchartPptx(document, { background, scale })
        downloadArtifact(artifact, exportFilename(document.metadata.title, "pptx"))
      } else if (format === "svg") {
        const svg = createFlowchartSvg(document, { background })
        validateFlowchartSvg(svg, document)
        const artifact = new Blob([svg], {
          type: "image/svg+xml;charset=utf-8",
        })
        downloadArtifact(
          artifact,
          exportFilename(document.metadata.title, "svg")
        )
      } else if (format === "pdf") {
        const artifact = await createFlowchartPdf(document, { background, scale })
        downloadArtifact(
          artifact,
          exportFilename(document.metadata.title, "pdf")
        )
      } else if (format === "jpg") {
        const artifact = await createFlowchartJpg(document, {
          background,
          scale,
        })
        downloadArtifact(
          artifact,
          exportFilename(document.metadata.title, "jpg")
        )
      } else {
        const artifact = await createFlowchartPng(document, {
          background,
          scale,
        })
        downloadArtifact(
          artifact,
          exportFilename(document.metadata.title, "png")
        )
      }

      toast.success(
        format === "certificate"
          ? "Local figure record downloaded"
          : `${format === "json" ? "JSON" : format.toUpperCase()} export is ready`,
        {
        description:
          format === "certificate"
            ? "A dated local record of this figure — not a legal license or journal approval."
            : format === "json"
              ? "The editable flowchart source document has been downloaded."
            : format === "svg"
              ? "The verified vector artifact has been downloaded."
            : format === "pdf"
              ? `The verified PDF page (${document.page.width} × ${document.page.height}, artwork at ${scale}×) has been downloaded.`
            : format === "pptx"
              ? "One PowerPoint slide with the verified figure has been downloaded."
              : format === "jpg"
                ? `The verified ${document.page.width * scale} × ${
                    document.page.height * scale
                  } JPG has been downloaded.`
              : `The verified ${document.page.width * scale} × ${
                  document.page.height * scale
                } PNG has been downloaded.`,
      })
    } catch (error) {
      toast.error("Export failed validation", {
        description:
          error instanceof Error
            ? error.message
            : "The browser could not create this artifact.",
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" aria-label="Export figure">
          <DownloadIcon aria-hidden="true" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle>Export flowchart</DialogTitle>
          <DialogDescription>
            Run deterministic publication checks, then download the current local
            document as vector or raster artwork.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(100svh-14rem)] px-5 py-4">
          <div className="space-y-5 pb-1">
            <section
              aria-labelledby="readiness-title"
              className="space-y-3 rounded-2xl border border-border/70 bg-surface p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="readiness-title" className="font-medium">
                    Publication readiness
                  </h3>
                  <p className="text-caption text-muted-foreground">
                    Checks the canonical document, not the viewport screenshot.
                  </p>
                </div>
                {report.ready ? (
                  <Badge variant="secondary">
                    <CircleCheckIcon aria-hidden="true" />
                    Ready
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <TriangleAlertIcon aria-hidden="true" />
                    {report.errors} blocking
                  </Badge>
                )}
              </div>

              {report.issues.length === 0 ? (
                <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
                  <CircleCheckIcon
                    className="mt-0.5 size-4 shrink-0 text-foreground"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-medium">All checks passed</p>
                    <p className="text-caption text-muted-foreground">
                      Labels, connections, page bounds, overlap, text size, contrast,
                      and reachability are valid.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {report.issues.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-md border border-border/70 p-3 text-start outline-none motion-safe:transition-[background-color,scale] motion-safe:duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]"
                      onClick={() => focusIssue(item.nodeIds, item.edgeIds)}
                    >
                      <TriangleAlertIcon
                        className={
                          item.severity === "error"
                            ? "mt-0.5 size-4 shrink-0 text-foreground"
                            : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                        }
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.title}</span>
                          <Badge variant="outline">{item.severity}</Badge>
                        </span>
                        <span className="mt-0.5 block text-caption text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            <section aria-labelledby="format-title" className="space-y-3">
              <div>
                <h3 id="format-title" className="font-medium">
                  Format
                </h3>
                <p className="text-caption text-muted-foreground">
                  SVG remains editable. PNG, JPG, PDF, and PPTX use the same verified scene.
                </p>
              </div>
                <RadioGroup
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
                className="grid gap-3 sm:grid-cols-2"
              >
                <FormatOption
                  id="export-svg"
                  value="svg"
                  title="SVG vector"
                  description="Editable shapes and text at any size."
                  icon={<FileType2Icon className="size-4" />}
                />
                <FormatOption
                  id="export-png"
                  value="png"
                  title="PNG image"
                  description="Publication-ready raster image."
                  icon={<FileImageIcon className="size-4" />}
                />
                <FormatOption
                  id="export-jpg"
                  value="jpg"
                  title="JPG image"
                  description="Compressed raster for slides and email."
                  icon={<FileImageIcon className="size-4" />}
                />
                <FormatOption
                  id="export-pdf"
                  value="pdf"
                  title="PDF document"
                  description="Print-ready page for journals."
                  icon={<FileTextIcon className="size-4" />}
                />
                <FormatOption
                  id="export-pptx"
                  value="pptx"
                  title="PowerPoint slide"
                  description="One slide with the figure, ready to drop into a deck."
                  icon={<FileTextIcon className="size-4" />}
                />
                <FormatOption
                  id="export-json"
                  value="json"
                  title="Source JSON"
                  description="The editable document for backup or re-import."
                  icon={<FileTextIcon className="size-4" />}
                />
                <FormatOption
                  id="export-certificate"
                  value="certificate"
                  title="Local figure record"
                  description="PDF with title, date, and local project id. Not a legal license."
                  icon={<FileTextIcon className="size-4" />}
                />
              </RadioGroup>
            </section>

            <section
              aria-labelledby="background-title"
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label id="background-title">Background</Label>
                <RadioGroup
                  aria-labelledby="background-title"
                  value={background}
                  onValueChange={(value) =>
                    setBackground(value as ExportBackground)
                  }
                >
                  <Label
                    htmlFor="background-document"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 p-3 has-data-checked:border-ring has-data-checked:bg-muted"
                  >
                    <RadioGroupItem
                      id="background-document"
                      value="document"
                    />
                    Document color
                  </Label>
                  <Label
                    htmlFor="background-transparent"
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 p-3 has-data-checked:border-ring has-data-checked:bg-muted"
                  >
                    <RadioGroupItem
                      id="background-transparent"
                      value="transparent"
                    />
                    Transparent
                  </Label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label id="dimensions-title">Output dimensions</Label>
                {format !== "svg" && format !== "json" && format !== "certificate" ? (
                  <RadioGroup
                    aria-labelledby="dimensions-title"
                    value={String(scale)}
                    onValueChange={(value) =>
                      setScale(Number(value) as ExportScale)
                    }
                  >
                    {[1, 2, 4].map((option) => (
                      <Label
                        key={option}
                        htmlFor={`scale-${option}`}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 p-3 has-data-checked:border-ring has-data-checked:bg-muted"
                      >
                        <span className="flex items-center gap-3">
                          <RadioGroupItem
                            id={`scale-${option}`}
                            value={String(option)}
                          />
                          {option}× scale
                        </span>
                        <span className="font-mono text-caption text-muted-foreground tabular-nums">
                          {document.page.width * option} ×{" "}
                          {document.page.height * option}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="rounded-lg border border-border/70 bg-muted/50 p-3">
                    <p className="font-mono text-ui tabular-nums">
                      {document.page.width} × {document.page.height}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      Scales without losing quality.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="mx-0 mb-0 rounded-none border-t bg-muted/50 px-5 py-4">
          {!report.ready && format !== "json" && format !== "certificate" && (
            <p className="self-center text-caption font-medium sm:me-auto">
              Resolve blocking issues before export.
            </p>
          )}
          <Button
            disabled={(format !== "json" && format !== "certificate" && !report.ready) || exporting}
            onClick={() => void exportArtifact()}
          >
            {exporting ? (
              <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <DownloadIcon aria-hidden="true" />
            )}
            {exporting
              ? "Validating…"
              : format === "certificate"
                ? "Download record"
                : `Download ${format === "json" ? "JSON" : format.toUpperCase()}`}
          </Button>
        </DialogFooter>

        <div className="sr-only" aria-live="polite">
          {exporting ? "Export validation in progress" : ""}
        </div>
      </DialogContent>
    </Dialog>
  )
}
