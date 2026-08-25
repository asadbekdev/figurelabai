"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { ApiRequestError, postJson } from "@/lib/api/client"
import type { ComposerSubmitInput } from "@/components/product/prompt-composer"
import {
  offeringFromComposerModel,
  providerChoiceForOffering,
} from "@/lib/generation/offerings"
import type { PublicGenerationJob } from "@/lib/jobs/types"
import { dataUrlToInline } from "@/lib/product/attachments"
import { markJobConsumed, wasJobConsumed } from "@/lib/product/generation-thread"
import { usePersistedRevisionJobId } from "@/lib/product/use-revision-job-id"
import { useProjectSessionStore } from "@/lib/product/project-session"
import {
  sourcePayloadFromAttachments,
  userMessageForAttachments,
} from "@/lib/product/source-payload"
import { useGenerationJob } from "@/lib/product/use-generation-job"
import { flushProjectSave } from "@/lib/product/use-project-persistence"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import type { FigureMode } from "@/lib/product/workspace-types"

export function useImageRevision({
  projectId,
  mode,
  title,
}: {
  projectId: string | null
  mode: Extract<FigureMode, "illustration" | "plot">
  title: string
}) {
  const asset = useProjectSessionStore((state) => state.asset)
  const setSession = useProjectSessionStore((state) => state.setSession)
  const addGeneratedImage = useWorkspaceStore((state) => state.addGeneratedImage)
  const appendMessage = useWorkspaceStore((state) => state.appendMessage)

  const [jobId, setJobId] = usePersistedRevisionJobId(projectId)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const appliedJob = useRef<string | null>(null)
  const { job, error: jobError } = useGenerationJob(jobId)

  useEffect(() => {
    if (job?.status !== "succeeded" || !job.resultImage || !projectId) return
    if (appliedJob.current === job.id || wasJobConsumed(job.id)) return
    appliedJob.current = job.id

    void (async () => {
      const image = job.resultImage
      if (!image) return
      const nextAsset = await addGeneratedImage({
        prompt: title,
        mimeType: image.mimeType,
        dataUrl: image.dataUrl,
        projectId,
      })
      const nextThread = await appendMessage(projectId, {
        authorType: "assistant",
        content:
          mode === "plot"
            ? "A new chart image replaced the previous version."
            : "A new illustration replaced the previous version.",
      })
      setSession({ asset: nextAsset, thread: nextThread })
      await flushProjectSave()
      markJobConsumed(job.id)
      setJobId(null)
      if (job.safeErrorMessage) toast.message(job.safeErrorMessage)
      else toast.success("Revision applied")
    })()
  }, [addGeneratedImage, appendMessage, job, mode, projectId, setJobId, setSession, title])

  const busy = creating || job?.status === "queued" || job?.status === "running"
  const displayError =
    error ?? jobError ?? (job?.status === "failed" ? job.safeErrorMessage : null)

  async function revise(input: ComposerSubmitInput) {
    if (!projectId) return
    setCreating(true)
    setError(null)
    try {
      const payload = sourcePayloadFromAttachments(input.prompt, input.attachments, input.plotData)
      const nextThread = await appendMessage(projectId, {
        authorType: "user",
        content: userMessageForAttachments(input.prompt, input.attachments, input.plotData),
      })
      setSession({ thread: nextThread })
      const sourceImage = asset?.dataUrl ? dataUrlToInline(asset.dataUrl) : undefined
      const result = await postJson<{ job: PublicGenerationJob }>("/api/generation/jobs", {
        type: mode === "plot" ? "plot" : "illustration_revision",
        prompt: payload.prompt,
        projectId,
        sourceImage: sourceImage
          ? {
              mimeType: sourceImage.mimeType as
                | "image/png"
                | "image/jpeg"
                | "image/webp"
                | "image/svg+xml",
              data: sourceImage.data,
            }
          : undefined,
        referenceImage: payload.sourceImage,
        sourceText: payload.sourceText,
        aspectRatio: input.aspectRatio,
        style: mode === "plot" ? undefined : input.style,
        inputMode: mode === "plot" ? undefined : input.inputMode,
        visualConsistency: mode === "plot" ? undefined : input.visualConsistency,
        paletteColors: input.paletteColors,
        imageSize: mode === "plot" ? undefined : input.imageSize,
        offering: offeringFromComposerModel(input.model),
        tabularData: mode === "plot" ? (payload.tabularData ?? input.prompt) : undefined,
        modelProvider: providerChoiceForOffering(input.model),
        idempotencyKey: crypto.randomUUID(),
      })
      setJobId(result.job.id)
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The revision could not be started. The current figure is unchanged."
      )
    } finally {
      setCreating(false)
    }
  }

  async function cancelJob() {
    if (!jobId) return
    try {
      const result = await postJson<{ job: PublicGenerationJob }>(
        `/api/generation/jobs/${jobId}/cancel`
      )
      setError(result.job.safeErrorMessage ?? "Revision was canceled.")
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ? caught.message : "The revision could not be canceled."
      )
    }
  }

  async function retryJob() {
    if (!jobId) return
    setError(null)
    try {
      const result = await postJson<{ job: PublicGenerationJob }>(
        `/api/generation/jobs/${jobId}/retry`
      )
      setJobId(result.job.id)
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ? caught.message : "The revision could not be retried."
      )
    }
  }

  return {
    job,
    jobId,
    busy,
    displayError,
    revise,
    cancelJob,
    retryJob,
  }
}
