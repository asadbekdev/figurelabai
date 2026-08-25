"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, Loader2Icon } from "@/components/icons"
import { toast } from "sonner"

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
import { NativeSelect, NativeSelectOption } from "@/components/align/native-select"
import { Textarea } from "@/components/align/textarea"
import { GenerationStatus } from "@/components/product/generation-status"
import { ApiRequestError, postJson } from "@/lib/api/client"
import { createFlowchartPng } from "@/lib/flowchart/export"
import { useFlowchartEditorStore } from "@/lib/flowchart/store"
import type { IllustrationStyle } from "@/lib/generation/contracts"
import {
  DEFAULT_IMAGE_OFFERING,
  IMAGE_OFFERINGS,
  providerChoiceForOffering,
  type ImageOfferingId,
} from "@/lib/generation/offerings"
import type { PublicGenerationJob } from "@/lib/jobs/types"
import { blobToSourceImage } from "@/lib/product/attachments"
import {
  composeIllustrationPrompt,
  ILLUSTRATION_STYLE_PRESETS,
} from "@/lib/product/illustration-input"
import { formatJobElapsed, useGenerationJob } from "@/lib/product/use-generation-job"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import { createEntityId, nowIso } from "@/lib/product/workspace-types"

const DEFAULT_PROMPT =
  "Redraw this flowchart as a clean journal-style scientific figure. Keep every step, label, and connection."

export function FlowchartFigureImageDialog() {
  const router = useRouter()
  const document = useFlowchartEditorStore((state) => state.document)
  const createImageProject = useWorkspaceStore((state) => state.createImageProject)
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [style, setStyle] = useState<IllustrationStyle>("flat")
  const [offering, setOffering] = useState<ImageOfferingId>(DEFAULT_IMAGE_OFFERING)
  const [creating, setCreating] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const appliedJob = useRef<string | null>(null)
  const { job, error: jobError } = useGenerationJob(jobId)
  const busy = creating || job?.status === "queued" || job?.status === "running"

  useEffect(() => {
    if (job?.status !== "succeeded" || !job.resultImage) return
    if (appliedJob.current === job.id) return
    appliedJob.current = job.id
    const resultImage = job.resultImage

    void (async () => {
      try {
        const created = await createImageProject({
          title: document.metadata.title || "Figure image",
          mode: "illustration",
          prompt,
          mimeType: resultImage.mimeType,
          dataUrl: resultImage.dataUrl,
          messages: [
            {
              id: createEntityId(),
              authorType: "user",
              content: prompt,
              createdAt: nowIso(),
            },
            {
              id: createEntityId(),
              authorType: "assistant",
              content: "Generated a publication-style figure image from the current flowchart.",
              createdAt: nowIso(),
            },
          ],
        })
        toast.success("Figure image ready")
        setOpen(false)
        setJobId(null)
        router.push(`/project/${created.project.id}`)
      } catch {
        setError("The figure image was generated but could not be saved locally.")
      }
    })()
  }, [createImageProject, document.metadata.title, job, prompt, router])

  async function generate() {
    if (!document.nodes.length) {
      setError("Add at least one node before generating a figure image.")
      return
    }
    setCreating(true)
    setError(null)
    try {
      const raster = await createFlowchartPng(document, { scale: 2, background: "document" })
      const sourceImage = await blobToSourceImage(raster)
      const composed = composeIllustrationPrompt({
        prompt: prompt.trim() || DEFAULT_PROMPT,
        inputMode: "image",
        generateAsImage: true,
      })
      const result = await postJson<{ job: PublicGenerationJob }>("/api/generation/jobs", {
        type: "illustration",
        prompt: composed,
        style,
        inputMode: "image",
        sourceImage,
        imageSize: "1k",
        offering,
        modelProvider: providerChoiceForOffering(offering),
        idempotencyKey: crypto.randomUUID(),
      })
      setJobId(result.job.id)
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The figure image could not be started. Try again."
      )
    } finally {
      setCreating(false)
    }
  }

  const displayError =
    error ??
    jobError ??
    (job?.status === "failed" || job?.status === "succeeded" ? job.safeErrorMessage : null)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <ImageIcon aria-hidden="true" />
          Generate figure image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate figure image</DialogTitle>
          <DialogDescription>
            Rasterize the current flowchart, then restyle it as a journal-style figure with the
            image model.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="figure-image-prompt">Restyle prompt</Label>
            <Textarea
              id="figure-image-prompt"
              rows={4}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={busy}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="figure-image-offering">Model</Label>
            <NativeSelect
              id="figure-image-offering"
              size="sm"
              className="w-full"
              value={offering}
              disabled={busy}
              onChange={(event) => setOffering(event.target.value as ImageOfferingId)}
            >
              {IMAGE_OFFERINGS.map((item) => (
                <NativeSelectOption key={item.id} value={item.id}>
                  {item.label} · {item.hint}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="figure-image-style">Style</Label>
            <NativeSelect
              id="figure-image-style"
              size="sm"
              className="w-full"
              value={style}
              disabled={busy}
              onChange={(event) => setStyle(event.target.value as IllustrationStyle)}
            >
              {(Object.entries(ILLUSTRATION_STYLE_PRESETS) as Array<
                [IllustrationStyle, (typeof ILLUSTRATION_STYLE_PRESETS)[IllustrationStyle]]
              >).map(([value, preset]) => (
                <NativeSelectOption key={value} value={value}>
                  {preset.label} · {preset.hint}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {jobId ? (
            <GenerationStatus
              title={
                job?.status === "failed"
                  ? "Figure image did not finish"
                  : job?.status === "canceled"
                    ? "Figure image canceled"
                    : "Drawing the figure image"
              }
              description="Uses the current flowchart as the source image"
              stages={job?.stages ?? ["Reading your request", "Rendering the illustration", "Saving the draft"]}
              activeStage={job?.activeStage ?? 0}
              progress={job?.progress ?? null}
              elapsed={job ? formatJobElapsed(job) : "0 sec"}
            />
          ) : null}
          {displayError ? (
            <p className="text-caption text-muted-foreground" role="alert">
              {displayError}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void generate()} disabled={busy}>
            {busy ? (
              <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <ImageIcon aria-hidden="true" />
            )}
            Generate figure image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
