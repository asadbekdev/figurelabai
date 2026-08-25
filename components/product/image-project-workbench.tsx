"use client"

import { useState } from "react"
import { DownloadIcon, FileTextIcon, Layers3Icon, Loader2Icon } from "@/components/icons"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/align/alert"
import { Button } from "@/components/align/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/align/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/align/tabs"
import { GenerationStatus } from "@/components/product/generation-status"
import {
  ImageEditBar,
  type ImageEditRequest,
} from "@/components/product/image-edit-bar"
import { IllustrationCanvas } from "@/components/product/illustration-canvas"
import { ProjectThreadView } from "@/components/product/project-thread"
import { ProjectVersionsPanel } from "@/components/product/project-versions-panel"
import { SaveToLibraryButton } from "@/components/product/save-to-library-button"
import { ImageShareDialog } from "@/components/product/share-dialog"
import { PublicationRecordDialog } from "@/components/product/publication-record-dialog"
import { VectorizeDialog } from "@/components/product/vectorize-dialog"
import {
  PromptComposer,
} from "@/components/product/prompt-composer"
import { createPdfFromDataUrl } from "@/lib/export/pdf"
import { createImagePptx, createPptxFromDataUrl } from "@/lib/export/pptx"
import {
  createIllustrationJpeg,
  createIllustrationPng,
  createJpegFromDataUrl,
} from "@/lib/illustration/export"
import { useIllustrationCanvasStore } from "@/lib/illustration/store"
import { downloadArtifact, exportFilename } from "@/lib/flowchart/export"
import { useProjectSessionStore } from "@/lib/product/project-session"
import { formatJobElapsed } from "@/lib/product/use-generation-job"
import { useImageRevision } from "@/lib/product/use-image-revision"

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a")
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}

export function ImageProjectWorkbench() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const title = useProjectSessionStore((state) => state.title)
  const mode = useProjectSessionStore((state) => state.mode)
  const asset = useProjectSessionStore((state) => state.asset)
  const thread = useProjectSessionStore((state) => state.thread)

  const revisionMode = mode === "plot" ? "plot" : "illustration"
  const { job, jobId, busy, displayError, revise, cancelJob, retryJob } = useImageRevision({
    projectId,
    mode: revisionMode,
    title,
  })
  const [exporting, setExporting] = useState<"pdf" | "pptx" | "jpg" | null>(null)
  const [railOpen, setRailOpen] = useState(false)
  const illustrationMode = mode === "illustration" && Boolean(asset)

  async function runEdit(request: ImageEditRequest) {
    await revise({
      mode: revisionMode,
      prompt: request.prompt,
      aspectRatio: request.aspectRatio ?? "auto",
      style: "publication",
      model: "nano-banana",
      variants: 1,
      attachments: [],
      plotData: "",
      inputMode: "text",
      visualConsistency: false,
      paletteColors: [],
      imageSize: request.imageSize ?? "1k",
      generateAsImage: false,
    })
  }

  const extension = asset?.mimeType.includes("svg")
    ? "svg"
    : asset?.mimeType.includes("jpeg")
      ? "jpg"
      : "png"

  async function downloadJpg() {
    if (!asset) return
    setExporting("jpg")
    try {
      const snapshot = useIllustrationCanvasStore.getState().snapshot()
      const figureTitle = title || asset.prompt || "Figure"
      const artifact =
        illustrationMode && snapshot && snapshot.objects.length > 0
          ? await createIllustrationJpeg({
              title: figureTitle,
              imageHref: asset.dataUrl,
              page: snapshot.page,
              objects: snapshot.objects,
            })
          : await createJpegFromDataUrl(asset.dataUrl)
      downloadArtifact(artifact, exportFilename(figureTitle, "jpg"))
      toast.success("JPG export is ready")
    } catch {
      toast.error("The JPG could not be created in this browser.")
    } finally {
      setExporting(null)
    }
  }

  async function downloadPdf() {
    if (!asset) return
    setExporting("pdf")
    try {
      const pdf = await createPdfFromDataUrl({
        dataUrl: asset.dataUrl,
        title: title || asset.prompt || "Figure",
      })
      downloadArtifact(pdf, exportFilename(title || "figure", "pdf"))
      toast.success("PDF export is ready")
    } catch {
      toast.error("The PDF could not be created in this browser.")
    } finally {
      setExporting(null)
    }
  }

  async function downloadPptx() {
    if (!asset) return
    setExporting("pptx")
    try {
      const snapshot = useIllustrationCanvasStore.getState().snapshot()
      const figureTitle = title || asset.prompt || "Figure"
      const artifact =
        illustrationMode && snapshot && snapshot.objects.length > 0
          ? await createImagePptx({
              bytes: new Uint8Array(
                await (
                  await createIllustrationPng({
                    title: figureTitle,
                    imageHref: asset.dataUrl,
                    page: snapshot.page,
                    objects: snapshot.objects,
                  })
                ).arrayBuffer()
              ),
              mimeType: "image/png",
              width: snapshot.page.width,
              height: snapshot.page.height,
              title: figureTitle,
            })
          : await createPptxFromDataUrl({
              dataUrl: asset.dataUrl,
              title: figureTitle,
            })
      downloadArtifact(artifact, exportFilename(figureTitle, "pptx"))
      toast.success("PowerPoint slide is ready")
    } catch {
      toast.error("The PowerPoint file could not be created in this browser.")
    } finally {
      setExporting(null)
    }
  }

  const exportRow = asset ? (
    <div className="flex flex-wrap justify-end gap-2">
      <SaveToLibraryButton
        prompt={title || asset.prompt || "Figure"}
        mimeType={asset.mimeType}
        dataUrl={asset.dataUrl}
        projectId={projectId}
      />
      <ImageShareDialog />
      {illustrationMode ? (
        <PublicationRecordDialog
          title={title || asset.prompt || "Figure"}
          projectId={projectId}
          figureKind="illustration"
        />
      ) : null}
      <VectorizeDialog
        image={{
          dataUrl: asset.dataUrl,
          mimeType: asset.mimeType,
          label: title || "figure",
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(exporting)}
        onClick={() => void downloadPdf()}
      >
        {exporting === "pdf" ? (
          <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <FileTextIcon aria-hidden="true" />
        )}
        PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(exporting)}
        onClick={() => void downloadPptx()}
      >
        {exporting === "pptx" ? (
          <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <FileTextIcon aria-hidden="true" />
        )}
        PPTX
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={Boolean(exporting)}
        onClick={() => void downloadJpg()}
      >
        {exporting === "jpg" ? (
          <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <DownloadIcon aria-hidden="true" />
        )}
        JPG
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          downloadDataUrl(
            asset.dataUrl,
            `${title.replace(/[^\w-]+/g, "-") || "figure"}.${extension}`
          )
        }
      >
        <DownloadIcon aria-hidden="true" />
        Download {extension.toUpperCase()}
      </Button>
    </div>
  ) : null

  const jobBlock =
    job && (busy || job.status === "failed" || job.status === "canceled") ? (
      <div className="space-y-3">
        <GenerationStatus
          title={
            job.status === "canceled"
              ? "Revision canceled"
              : job.status === "failed"
                ? "Revision did not finish"
                : mode === "plot"
                  ? "Revising the chart"
                  : "Revising the illustration"
          }
          description="Stages resume after reload"
          stages={job.stages}
          activeStage={job.activeStage}
          progress={job.progress}
          elapsed={formatJobElapsed(job)}
        />
        {busy ? (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => void cancelJob()}>
              Cancel
            </Button>
          </div>
        ) : null}
        {job.status === "failed" || job.status === "canceled" ? (
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void retryJob()}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    ) : null

  const versionsRail = (
    <Tabs defaultValue="versions" className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="px-3 pt-3">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="versions" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ProjectVersionsPanel />
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {illustrationMode && asset && projectId ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-end px-3 py-1 lg:hidden">
              <Sheet open={railOpen} onOpenChange={setRailOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Layers3Icon aria-hidden="true" />
                    Versions
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 bg-sidebar p-0 sm:max-w-none">
                  <SheetHeader className="px-3 pt-4">
                    <SheetTitle>Versions</SheetTitle>
                    <SheetDescription>
                      Restore an older revision without deleting later ones.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="h-[calc(100svh-6rem)]">{versionsRail}</div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="max-h-28 shrink-0 overflow-y-auto px-4 pt-3">
              <ProjectThreadView thread={thread} />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pt-2">
              <IllustrationCanvas
                projectId={projectId}
                assetId={asset.id}
                dataUrl={asset.dataUrl}
                title={title || asset.prompt || "Figure"}
                busy={busy}
                onRunEdit={(prompt) => void runEdit({ prompt })}
              />
            </div>
            <div className="shrink-0 space-y-3 px-4 py-3">
              <ImageEditBar
                busy={busy}
                imageLabel={title || asset.prompt || "figure"}
                onRunEdit={(request) => void runEdit(request)}
              />
              {exportRow}
              {jobBlock}
              {displayError ? (
                <Alert variant="destructive">
                  <AlertTitle>Revision did not finish</AlertTitle>
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>
          <aside className="hidden h-full w-80 shrink-0 border-s border-border bg-muted lg:block">
            {versionsRail}
          </aside>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <ProjectThreadView thread={thread} />

            {asset ? (
              <figure className="space-y-3">
                <ImageEditBar
                  busy={busy}
                  imageLabel={title || asset.prompt || "figure"}
                  onRunEdit={(request) => void runEdit(request)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.dataUrl}
                    alt={asset.prompt ?? title}
                    className="image-outline w-full rounded-lg bg-sidebar"
                  />
                </ImageEditBar>
                {exportRow}
                {mode === "plot" ? (
                  <p className="text-caption text-hollow">
                    This plot has no editable table. Generate from pasted CSV to open the live
                    chart editor, or revise this image with AI.
                  </p>
                ) : null}
              </figure>
            ) : (
              <p className="text-meta text-muted-foreground">This project has no image yet.</p>
            )}

            {jobBlock}

            {displayError ? (
              <Alert variant="destructive">
                <AlertTitle>Revision did not finish</AlertTitle>
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            ) : null}

            <section aria-labelledby="image-versions-title" className="space-y-3">
              <h2 id="image-versions-title" className="text-ui font-medium">
                Versions
              </h2>
              <ProjectVersionsPanel />
            </section>
          </div>
        </div>
      )}

      <div className="shrink-0 px-4 pb-3 pt-2">
        <PromptComposer
          compact
          availableModes={[mode === "plot" ? "plot" : "illustration"]}
          initialMode={mode === "plot" ? "plot" : "illustration"}
          showCredits={false}
          busy={busy}
          onCancel={busy && jobId ? () => void cancelJob() : undefined}
          submitLabel="Request change"
          submissionMessage="Revision requested"
          onSubmit={revise}
        />
      </div>
    </div>
  )
}
