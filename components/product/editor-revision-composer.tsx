"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/align/alert"
import { Badge } from "@/components/align/badge"
import { Button } from "@/components/align/button"
import { GenerationStatus } from "@/components/product/generation-status"
import { ProjectThreadView } from "@/components/product/project-thread"
import {
  PromptComposer,
  type ComposerSubmitInput,
} from "@/components/product/prompt-composer"
import { ApiRequestError, postJson } from "@/lib/api/client"
import {
  fingerprintFlowchartRevisionBase,
  resolveFlowchartRevisionCompletion,
  summarizeFlowchartRevisionPatch,
  type FlowchartRevisionPatchChange,
} from "@/lib/flowchart/revision-application"
import type { FlowchartDocument } from "@/lib/flowchart/schema"
import { useFlowchartEditorStore } from "@/lib/flowchart/store"
import type { PublicGenerationJob } from "@/lib/jobs/types"
import { markJobConsumed, wasJobConsumed } from "@/lib/product/generation-thread"
import { usePersistedRevisionJobId } from "@/lib/product/use-revision-job-id"
import { useProjectSessionStore } from "@/lib/product/project-session"
import {
  sourcePayloadFromAttachments,
  userMessageForAttachments,
} from "@/lib/product/source-payload"
import { flushProjectSave } from "@/lib/product/use-project-persistence"
import { formatJobElapsed, useGenerationJob } from "@/lib/product/use-generation-job"
import { useWorkspaceStore } from "@/lib/product/workspace-store"

type PendingRevisionReview = {
  jobId: string
  baseRevision: number | null
  baseDocumentChecksum: string
  document: FlowchartDocument
  changes: FlowchartRevisionPatchChange[]
  conflicted: boolean
}

export function EditorRevisionComposer() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const thread = useProjectSessionStore((state) => state.thread)
  const setSession = useProjectSessionStore((state) => state.setSession)
  const appendMessage = useWorkspaceStore((state) => state.appendMessage)
  const currentDocument = useFlowchartEditorStore((state) => state.document)
  const replaceDocument = useFlowchartEditorStore((state) => state.replaceDocument)
  const [jobId, setJobId] = usePersistedRevisionJobId(projectId)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const { job, error: jobError } = useGenerationJob(jobId)
  const pendingReview = useMemo<PendingRevisionReview | null>(() => {
    if (job?.status !== "succeeded" || !job.resultDocument || wasJobConsumed(job.id)) {
      return null
    }
    const baseDocumentChecksum =
      job.baseDocumentChecksum ??
      // Jobs created before the base guard shipped can be reviewed, but
      // acceptance will fail safely against this sentinel.
      "missing-revision-base"
    const conflicted =
      baseDocumentChecksum !== fingerprintFlowchartRevisionBase(currentDocument)
    return {
      jobId: job.id,
      baseRevision: job.baseRevision,
      baseDocumentChecksum,
      document: job.resultDocument,
      changes: conflicted
        ? []
        : summarizeFlowchartRevisionPatch(currentDocument, job.resultDocument),
      conflicted,
    }
  }, [currentDocument, job])

  const busy = creating || job?.status === "queued" || job?.status === "running"
  const threadMessageCount = thread?.messages.length ?? (thread?.prompt ? 1 : 0)
  const displayError =
    error ?? jobError ?? (job?.status === "failed" ? job.safeErrorMessage : null)
  async function revise(input: ComposerSubmitInput) {
    if (!projectId) return
    setCreating(true)
    setError(null)
    try {
      await flushProjectSave()
      const baseDocument = useFlowchartEditorStore.getState().document
      const baseRevision = useProjectSessionStore.getState().revision
      const payload = sourcePayloadFromAttachments(input.prompt, input.attachments)
      const nextThread = await appendMessage(projectId, {
        authorType: "user",
        content: userMessageForAttachments(input.prompt, input.attachments),
      })
      setSession({ thread: nextThread })
      const result = await postJson<{ job: PublicGenerationJob }>("/api/generation/jobs", {
        type: "revision",
        prompt: payload.prompt,
        document: baseDocument,
        baseRevision,
        sourceText: payload.sourceText,
        sourceImage: payload.sourceImage,
        // Editable flowcharts do not expose an image-model picker. Let the
        // server's configured flowchart provider decide instead of leaking the
        // hidden image offering into revision requests.
        modelProvider: undefined,
        projectId,
        idempotencyKey: crypto.randomUUID(),
      })
      setJobId(result.job.id)
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The revision could not be started. Your current figure is unchanged."
      )
    } finally {
      setCreating(false)
    }
  }

  async function recordAssistantMessage(content: string) {
    if (!projectId) return
    try {
      const next = await appendMessage(projectId, { authorType: "assistant", content })
      setSession({ thread: next })
    } catch {
      // The document decision is authoritative even when an optional history
      // message cannot be persisted in the local workspace.
    }
  }

  async function acceptPatch() {
    if (!pendingReview) return
    const currentDocument = useFlowchartEditorStore.getState().document
    const completion = resolveFlowchartRevisionCompletion({
      baseRevision: pendingReview.baseRevision,
      baseDocumentChecksum: pendingReview.baseDocumentChecksum,
      currentRevision: useProjectSessionStore.getState().revision,
      currentDocument,
      resultDocument: pendingReview.document,
    })

    markJobConsumed(pendingReview.jobId)
    setJobId(null)

    if (completion.status === "conflict") {
      const message =
        "The suggested patch was not applied because the figure changed during review. Your newer edits were preserved."
      setError(message)
      await recordAssistantMessage(message)
      toast.warning("Newer edits preserved")
      return
    }

    replaceDocument(completion.document, "Accepted AI patch")
    await recordAssistantMessage(
      `Accepted AI patch with ${pendingReview.changes.length} scoped ${
        pendingReview.changes.length === 1 ? "change" : "changes"
      }. Use Undo to revert it.`
    )
    toast.success("AI patch applied", {
      description: "The patch is one undo step and will autosave locally.",
    })
  }

  async function rejectPatch() {
    if (!pendingReview) return
    markJobConsumed(pendingReview.jobId)
    setJobId(null)
    await recordAssistantMessage("Rejected the suggested AI patch. The figure was not changed.")
    toast.message("AI patch rejected", { description: "Your figure is unchanged." })
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

  return (
    <div className="space-y-3">
      {threadMessageCount > 0 ? (
        <details className="group mx-auto w-full max-w-3xl rounded-lg bg-muted px-3 py-2">
          <summary className="cursor-pointer text-ui text-muted-foreground outline-none marker:text-hollow focus-visible:ring-3 focus-visible:ring-ring/50">
            Revision history · <span className="tabular-nums">{threadMessageCount}</span>
          </summary>
          <div className="mt-3 max-h-40 overflow-y-auto pe-2">
            <ProjectThreadView thread={thread} />
          </div>
        </details>
      ) : null}
      {job && (busy || job.status === "failed" || job.status === "canceled") ? (
        <div className="space-y-3">
          <GenerationStatus
            title={
              job.status === "canceled"
                ? "Revision canceled"
                : job.status === "failed"
                  ? "Revision did not finish"
                  : "Revising the flowchart"
            }
            description={
              job.provider === "fixture"
                ? "Fixture provider · stages resume after reload"
                : "You can keep editing. Newer edits will never be replaced silently."
            }
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
      ) : null}
      {displayError && (
        <Alert variant="destructive">
          <AlertTitle>Revision did not finish</AlertTitle>
          <AlertDescription>{displayError}</AlertDescription>
        </Alert>
      )}
      {pendingReview ? (
        <section
          aria-labelledby="ai-patch-review-title"
          className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-regular-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
            <div className="min-w-0">
              <h2 id="ai-patch-review-title" className="text-title-sm font-semibold">
                Review AI patch
              </h2>
              <p className="mt-1 text-meta text-muted-foreground">
                Nothing changes until you accept this scoped patch.
              </p>
            </div>
            <Badge variant="secondary" className="tabular-nums uppercase">
              {pendingReview.changes.length} {pendingReview.changes.length === 1 ? "change" : "changes"}
            </Badge>
          </div>

          <div className="space-y-2 px-4 pb-4">
            {pendingReview.conflicted ? (
              <Alert>
                <AlertTitle>This patch no longer matches the figure</AlertTitle>
                <AlertDescription>
                  Reject it and request the change again. Your newer manual edits remain untouched.
                </AlertDescription>
              </Alert>
            ) : pendingReview.changes.length === 0 ? (
              <div className="rounded-xl bg-muted p-3 text-meta text-muted-foreground">
                The AI returned the same figure. Reject this patch or request a more specific change.
              </div>
            ) : (
              pendingReview.changes.slice(0, 6).map((change) => (
                <article key={change.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-ui font-semibold">{change.title}</p>
                      <p className="mt-1 text-caption text-muted-foreground">
                        {change.description}
                      </p>
                    </div>
                    <Badge
                      variant={change.action === "remove" ? "destructive" : "secondary"}
                      className="uppercase"
                    >
                      {change.action}
                    </Badge>
                  </div>
                </article>
              ))
            )}
            {pendingReview.changes.length > 6 ? (
              <p className="px-1 text-caption text-muted-foreground">
                +{pendingReview.changes.length - 6} more scoped changes
              </p>
            ) : null}
            <div className="flex items-start gap-2 rounded-xl bg-muted p-3">
              <Badge variant="outline" className="shrink-0 uppercase text-primary">
                Scoped
              </Badge>
              <p className="text-caption text-muted-foreground">
                Accepting replaces only this reviewed revision. Any newer manual edit blocks the patch.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="outline" onClick={() => void rejectPatch()}>
              Reject
            </Button>
            <Button
              type="button"
              disabled={pendingReview.conflicted || pendingReview.changes.length === 0}
              onClick={() => void acceptPatch()}
            >
              Accept patch
            </Button>
          </div>
        </section>
      ) : null}
      <PromptComposer
        compact
        availableModes={["flowchart"]}
        initialPrompt=""
        showCredits={false}
        busy={busy || Boolean(pendingReview)}
        onCancel={busy && jobId ? () => void cancelJob() : undefined}
        submitLabel="Request change"
        submissionMessage="Revision requested"
        onSubmit={revise}
      />
    </div>
  )
}
