"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon, SparklesIcon } from "@/components/icons"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/align/alert"
import { Button } from "@/components/align/button"
import { FlowchartPlanReview } from "@/components/product/flowchart-plan-review"
import { GeneratedImageCard } from "@/components/product/generated-image-card"
import { GenerationStatus } from "@/components/product/generation-status"
import {
  PromptComposer,
  type ComposerMode,
  type ComposerSubmitInput,
} from "@/components/product/prompt-composer"
import { ApiRequestError, postJson } from "@/lib/api/client"
import type { FigurePlan, ModelProviderChoice } from "@/lib/generation/contracts"
import {
  offeringFromComposerModel,
  providerChoiceForOffering,
} from "@/lib/generation/offerings"
import { useGenerationSessionStore } from "@/lib/generation/session-store"
import { parseFlowchartDocument } from "@/lib/flowchart/schema"
import { parseTable, plotDocumentFromTable } from "@/lib/plot/parse"
import type { GenerationJobType, PublicGenerationJob } from "@/lib/jobs/types"
import { isImageJobType } from "@/lib/jobs/types"
import {
  EMPTY_GENERATION_THREAD,
  clearComposerSeed,
  clearGenerationThread,
  markJobConsumed,
  readComposerSeed,
  readGenerationThread,
  subscribeComposerSeed,
  subscribeGenerationThread,
  wasJobConsumed,
  writeGenerationThread,
  type GenerationThreadSnapshot,
} from "@/lib/product/generation-thread"
import {
  sourcePayloadFromAttachments,
  userMessageForAttachments,
} from "@/lib/product/source-payload"
import { formatJobElapsed, useGenerationJob, useGenerationJobs } from "@/lib/product/use-generation-job"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import { createEntityId, nowIso, type ProjectMessage } from "@/lib/product/workspace-types"
import { cn } from "@/lib/utils"

type Phase = "idle" | "planning" | "review" | "generating" | "asking"

const STARTER_PROMPT =
  "Map a six-step PCR workflow with a quality-control decision and retry loop"

function message(authorType: ProjectMessage["authorType"], content: string): ProjectMessage {
  return {
    id: createEntityId(),
    authorType,
    content,
    createdAt: nowIso(),
  }
}

export function WorkbenchGeneration({ className }: { className?: string }) {
  const router = useRouter()
  const addImage = useGenerationSessionStore((state) => state.addImage)
  const setLastPlan = useGenerationSessionStore((state) => state.setLastPlan)
  const latestImage = useGenerationSessionStore((state) => state.images[0] ?? null)
  const chatMessages = useGenerationSessionStore((state) => state.chatMessages)
  const appendChat = useGenerationSessionStore((state) => state.appendChat)
  const createFlowchartProject = useWorkspaceStore((state) => state.createFlowchartProject)
  const createImageProject = useWorkspaceStore((state) => state.createImageProject)
  const createPlotProject = useWorkspaceStore((state) => state.createPlotProject)

  const appliedJob = useRef<string | null>(null)
  const planningRequest = useRef<AbortController | null>(null)
  const persistedThread = useSyncExternalStore(
    subscribeGenerationThread,
    readGenerationThread,
    () => EMPTY_GENERATION_THREAD
  )
  const persistedSeed = useSyncExternalStore(
    subscribeComposerSeed,
    readComposerSeed,
    () => null
  )
  const [localThread, setLocalThread] = useState<GenerationThreadSnapshot | null>(null)
  const localThreadRef = useRef<GenerationThreadSnapshot | null>(null)
  const [asking, setAsking] = useState(false)
  const thread = localThread ?? persistedThread
  const prompt = thread.prompt
  const plan = thread.plan
  const jobId = thread.jobId
  const jobType = thread.jobType ?? "initial_generation"
  const variantJobIds = thread.variantJobIds ?? []
  const idempotencyKey = thread.idempotencyKey
  const phase: Phase = asking
    ? "asking"
    : thread.jobId && thread.phase === "idle"
      ? "generating"
      : thread.phase
  const [source, setSource] = useState(() => sourcePayloadFromAttachments("", []))
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [composerSeed, setComposerSeed] = useState<string | undefined>(undefined)
  const [composerMode, setComposerMode] = useState<ComposerMode | undefined>(undefined)
  const [pendingModelProvider, setPendingModelProvider] = useState<ModelProviderChoice | undefined>(
    undefined
  )
  const seedPrompt = composerSeed ?? persistedSeed?.prompt ?? ""
  const seedMode = composerMode ?? persistedSeed?.mode
  const { job, error: jobError, errorCode: jobErrorCode } = useGenerationJob(jobId)
  const variantJobs = useGenerationJobs(variantJobIds)
  const jobMissing = jobErrorCode === "JOB_NOT_FOUND"
  const variantsRunning = variantJobs.some(
    (item) => item.status === "queued" || item.status === "running"
  )

  const busy =
    !jobMissing &&
    (phase === "planning" ||
      phase === "generating" ||
      phase === "asking" ||
      job?.status === "queued" ||
      job?.status === "running" ||
      variantsRunning)
  const hasThread =
    Boolean(prompt) ||
    Boolean(plan) ||
    Boolean(latestImage) ||
    Boolean(jobId) ||
    variantJobIds.length > 0 ||
    chatMessages.length > 0 ||
    phase !== "idle"

  function patchThread(patch: Partial<GenerationThreadSnapshot>) {
    const next = { ...(localThreadRef.current ?? readGenerationThread()), ...patch }
    localThreadRef.current = next
    setLocalThread(next)
    writeGenerationThread(next)
  }

  function setPrompt(next: string) {
    patchThread({ prompt: next })
  }

  function setPlan(next: FigurePlan | null) {
    patchThread({ plan: next })
  }

  function setJobId(next: string | null) {
    patchThread({ jobId: next })
  }

  function setJobType(next: GenerationJobType) {
    patchThread({ jobType: next })
  }

  function setVariantJobIds(next: string[]) {
    patchThread({ variantJobIds: next })
  }

  function setIdempotencyKey(next: string | null) {
    patchThread({ idempotencyKey: next })
  }

  function setPhase(next: Phase) {
    if (next === "asking") {
      setAsking(true)
      return
    }
    setAsking(false)
    patchThread({ phase: next })
  }

  useEffect(() => {
    if (!busy || job) return
    const started = Date.now()
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [busy, job])

  useEffect(
    () => () => {
      planningRequest.current?.abort()
    },
    []
  )

  useEffect(() => {
    if (job?.status !== "succeeded") return
    if (appliedJob.current === job.id || wasJobConsumed(job.id)) return
    appliedJob.current = job.id

    void (async () => {
      try {
        if (job.resultDocument) {
          const document = parseFlowchartDocument(job.resultDocument)
          const project = await createFlowchartProject({
            title: plan?.title || document.metadata.title,
            document,
            source: "generation",
            prompt,
            plan,
            messages: [
              message("user", prompt),
              message("assistant", "The flowchart draft is ready to edit."),
            ],
          })
          markJobConsumed(job.id)
          clearGenerationThread()
          toast.success("Flowchart draft is ready to edit")
          router.push(`/project/${project.id}`)
          return
        }

        if (job.resultImage) {
          addImage({
            prompt,
            mimeType: job.resultImage.mimeType,
            dataUrl: job.resultImage.dataUrl,
          })
          const mode = job.type === "plot" ? "plot" : "illustration"

          if (mode === "plot" && source.tabularData) {
            const table = parseTable(source.tabularData)
            const plotDocument = table
              ? plotDocumentFromTable({
                  table,
                  title: prompt.slice(0, 80) || "Plot",
                  description: prompt.slice(0, 400),
                })
              : null
            if (plotDocument) {
              const created = await createPlotProject({
                title: plotDocument.metadata.title,
                prompt,
                document: plotDocument,
                mimeType: job.resultImage.mimeType,
                dataUrl: job.resultImage.dataUrl,
                messages: [
                  message("user", prompt),
                  message(
                    "assistant",
                    "The chart is ready. Edit the live chart below, or ask for an AI revision."
                  ),
                ],
              })
              markJobConsumed(job.id)
              clearGenerationThread()
              toast.success("Plot ready to edit")
              router.push(`/project/${created.project.id}`)
              return
            }
          }

          const created = await createImageProject({
            title: prompt.slice(0, 80) || (mode === "plot" ? "Plot" : "Illustration"),
            mode,
            prompt,
            mimeType: job.resultImage.mimeType,
            dataUrl: job.resultImage.dataUrl,
            messages: [
              message("user", prompt),
              message(
                "assistant",
                mode === "plot"
                  ? "The chart image is ready. You can download it or ask for a revision."
                  : "The illustration is ready. You can download PNG or ask for a revision."
              ),
            ],
          })
          markJobConsumed(job.id)
          clearGenerationThread()
          toast.success(mode === "plot" ? "Plot ready" : "Illustration ready")
          router.push(`/project/${created.project.id}`)
        }
      } catch {
        toast.error("The result was generated but could not be saved locally. Try again.")
      }
    })()
  }, [addImage, createFlowchartProject, createImageProject, createPlotProject, job, plan, prompt, router, source])

  async function ask(content: string, modelProvider?: ModelProviderChoice) {
    const userMessage = {
      id: `user-${Date.now().toString(36)}`,
      role: "user" as const,
      content,
    }
    const history = [...chatMessages, userMessage].map(({ role, content: text }) => ({
      role,
      content: text,
    }))
    appendChat(userMessage)
    setPhase("asking")
    try {
      const result = await postJson<{ message: { role: "assistant"; content: string } }>(
        "/api/generation/chat",
        { messages: history, modelProvider }
      )
      appendChat({
        id: `assistant-${Date.now().toString(36)}`,
        role: "assistant",
        content: result.message.content,
      })
      setPhase("idle")
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The assistant could not reply. Try again."
      )
      setPhase("idle")
    }
  }

  async function startFromComposer(input: ComposerSubmitInput) {
    setError(null)
    clearComposerSeed()
    setComposerSeed(undefined)
    setComposerMode(undefined)
    const payload = sourcePayloadFromAttachments(input.prompt, input.attachments, input.plotData)
    const usesOfferingProvider =
      input.mode === "illustration" || input.mode === "plot" || input.generateAsImage
    const modelProvider: ModelProviderChoice | undefined = usesOfferingProvider
      ? providerChoiceForOffering(input.model)
      : undefined
    const offering = offeringFromComposerModel(input.model)
    setPendingModelProvider(modelProvider)
    setPrompt(userMessageForAttachments(payload.prompt, input.attachments, input.plotData))
    setSource(payload)
    setElapsed(0)

    if (input.mode === "ask") {
      await ask(payload.prompt, modelProvider)
      return
    }

    if (input.mode === "plot" && !payload.tabularData && !payload.sourceImage) {
      setError("Plot mode needs a pasted table or a CSV attachment. It creates a chart image, not an editable chart.")
      return
    }

    if (input.mode === "illustration" || input.mode === "plot" || input.generateAsImage) {
      const nextType: GenerationJobType = input.mode === "plot" ? "plot" : "illustration"
      setJobType(nextType)
      setPhase("generating")

      if (input.mode !== "plot" && input.variants > 1) {
        try {
          const ids: string[] = []
          for (let index = 0; index < input.variants; index += 1) {
            const result = await postJson<{ job: PublicGenerationJob }>("/api/generation/jobs", {
              type: "illustration",
              prompt: payload.prompt,
              aspectRatio: input.aspectRatio,
              style: input.style,
              inputMode: input.generateAsImage ? "text" : input.inputMode,
              visualConsistency: input.visualConsistency,
              paletteColors: input.paletteColors,
              imageSize: input.imageSize,
              offering,
              sourceImage: payload.sourceImage,
              referenceImage:
                input.visualConsistency ||
                (input.inputMode !== "text" && !input.generateAsImage)
                  ? payload.sourceImage
                  : undefined,
              sourceText: payload.sourceText,
              modelProvider,
              idempotencyKey: crypto.randomUUID(),
            })
            ids.push(result.job.id)
          }
          setVariantJobIds(ids)
          setJobId(null)
        } catch (caught) {
          setError(
            caught instanceof ApiRequestError
              ? caught.message
              : "The variant jobs could not be created. Try again."
          )
          setPhase("idle")
        }
        return
      }

      const key = crypto.randomUUID()
      setIdempotencyKey(key)
      try {
        const result = await postJson<{ job: PublicGenerationJob }>("/api/generation/jobs", {
          type: nextType,
          prompt: payload.prompt,
          aspectRatio: input.aspectRatio,
          style: input.mode === "plot" ? undefined : input.style,
          inputMode:
            input.mode === "plot" ? undefined : input.generateAsImage ? "text" : input.inputMode,
          visualConsistency: input.mode === "plot" ? undefined : input.visualConsistency,
          paletteColors: input.paletteColors,
          imageSize: input.mode === "plot" ? undefined : input.imageSize,
          offering,
          sourceImage: payload.sourceImage,
          referenceImage:
            input.mode !== "plot" &&
            (input.visualConsistency || (input.inputMode !== "text" && !input.generateAsImage))
              ? payload.sourceImage
              : undefined,
          sourceText: payload.sourceText,
          tabularData: payload.tabularData,
          modelProvider,
          idempotencyKey: key,
        })
        setJobId(result.job.id)
      } catch (caught) {
        setError(
          caught instanceof ApiRequestError
            ? caught.message
            : "The generation job could not be created. Try again."
        )
        setPhase("idle")
      }
      return
    }

    planningRequest.current?.abort()
    const controller = new AbortController()
    planningRequest.current = controller
    setPhase("planning")
    try {
      const result = await postJson<{ plan: FigurePlan }>("/api/generation/plan", {
        prompt: payload.prompt,
        sourceText: payload.sourceText,
        sourceImage: payload.sourceImage,
        modelProvider,
      }, controller.signal)
      setPlan(result.plan)
      setLastPlan(result.plan)
      setJobId(null)
      setIdempotencyKey(crypto.randomUUID())
      setPhase("review")
    } catch (caught) {
      if (controller.signal.aborted) {
        setPhase("idle")
        return
      }
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The plan could not be created. Try again."
      )
      setPhase("idle")
    } finally {
      if (planningRequest.current === controller) planningRequest.current = null
    }
  }

  function cancelPlanning() {
    planningRequest.current?.abort()
    planningRequest.current = null
    setError("Planning was canceled. Revise the prompt and try again when you are ready.")
    setPhase("idle")
  }

  async function approvePlan(nextPlan: FigurePlan) {
    const key = idempotencyKey ?? crypto.randomUUID()
    setPlan(nextPlan)
    setLastPlan(nextPlan)
    setIdempotencyKey(key)
    setError(null)
    setJobType("initial_generation")
    setPhase("generating")

    try {
      const result = await postJson<{ job: PublicGenerationJob }>("/api/generation/jobs", {
        type: "initial_generation",
        prompt: source.prompt || prompt,
        plan: nextPlan,
        sourceText: source.sourceText,
        sourceImage: source.sourceImage,
        modelProvider: pendingModelProvider,
        idempotencyKey: key,
      })
      setJobId(result.job.id)
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The generation job could not be created. Try again."
      )
      setPhase("review")
    }
  }

  async function cancelJob() {
    if (!jobId) return
    try {
      const result = await postJson<{ job: PublicGenerationJob }>(
        `/api/generation/jobs/${jobId}/cancel`
      )
      setError(result.job.safeErrorMessage ?? "Generation was canceled.")
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The job could not be canceled."
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
      setPhase("generating")
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "The job could not be retried."
      )
    }
  }

  function recoverMissingJob() {
    setJobId(null)
    setIdempotencyKey(crypto.randomUUID())
    setError(
      plan && jobType === "initial_generation"
        ? "The expired job was cleared. Review the plan, then generate again."
        : "The expired job was cleared. Your prompt is ready to try again."
    )
    setPhase(plan && jobType === "initial_generation" ? "review" : "idle")
  }

  async function cancelVariants() {
    setError(null)
    await Promise.allSettled(
      variantJobIds.map((id) => postJson(`/api/generation/jobs/${id}/cancel`))
    )
  }

  async function retryVariant(id: string) {
    setError(null)
    try {
      await postJson(`/api/generation/jobs/${id}/retry`)
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ? caught.message : "That variant could not be retried."
      )
    }
  }

  function discardVariants() {
    for (const id of variantJobIds) markJobConsumed(id)
    setVariantJobIds([])
    setPhase("idle")
  }

  async function pickVariant(picked: PublicGenerationJob) {
    if (!picked.resultImage) return
    for (const id of variantJobIds) markJobConsumed(id)
    try {
      const created = await createImageProject({
        title: prompt.slice(0, 80) || "Illustration",
        mode: "illustration",
        prompt,
        mimeType: picked.resultImage.mimeType,
        dataUrl: picked.resultImage.dataUrl,
        messages: [
          message("user", prompt),
          message(
            "assistant",
            `Variant ${variantJobIds.indexOf(picked.id) + 1} of ${variantJobIds.length} selected. You can download it or ask for a revision.`
          ),
        ],
      })
      clearGenerationThread()
      toast.success("Variant saved as a project")
      router.push(`/project/${created.project.id}`)
    } catch {
      toast.error("The variant could not be saved locally. Try again.")
    }
  }

  const jobRunning = job?.status === "queued" || job?.status === "running"
  const jobTerminalFailed = job?.status === "failed" || job?.status === "canceled"
  const imageJob = job ? isImageJobType(job.type) : isImageJobType(jobType)

  function tryStarterPrompt() {
    setComposerMode("flowchart")
    setComposerSeed(STARTER_PROMPT)
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>('[data-slot="prompt-input"]')?.focus()
    })
  }

  const composer = (
    <PromptComposer
      key={`${seedMode ?? "flowchart"}:${seedPrompt}`}
      className="mx-auto"
      initialPrompt={seedPrompt}
      initialMode={seedMode}
      showCredits={false}
      busy={busy}
      onCancel={
        phase === "planning"
          ? cancelPlanning
          : jobRunning
            ? () => void cancelJob()
            : undefined
      }
      submissionMessage="Prompt received"
      onSubmit={startFromComposer}
    />
  )

  if (!hasThread) {
    return (
      <div className={cn("relative min-h-0 flex-1", className)}>
        <div className="workbench-empty-hero pointer-events-none absolute inset-0 flex -translate-y-7 flex-col items-center justify-center gap-5 px-5">
          <SparklesIcon className="size-8 text-hollow" aria-hidden="true" />
          <div className="space-y-1.5 text-center">
            <h1 className="text-heading text-balance">Hello</h1>
            <p className="text-caption text-hollow text-pretty">
              Describe a workflow. Review the plan before we build it.
            </p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-5 pb-3.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="workbench-suggestion max-w-full bg-background"
            aria-label={`Try example prompt: ${STARTER_PROMPT}`}
            onClick={tryStarterPrompt}
          >
            <SparklesIcon aria-hidden="true" />
            <span className="truncate">Try an example: PCR workflow with a QC retry</span>
          </Button>
          <div className="w-full max-w-[700px]">{composer}</div>
          <p className="text-center text-xs font-medium leading-4 text-hollow">
            FigureLab can make mistakes — check figures before you publish.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {prompt ? (
            <article className="ms-auto max-w-xl rounded-2xl bg-muted px-3.5 py-2.5 text-body whitespace-pre-wrap">
              {prompt}
            </article>
          ) : null}

          {chatMessages.map((item) => (
            <article
              key={item.id}
              className={cn(
                "max-w-xl text-body",
                item.role === "user"
                  ? "ms-auto rounded-2xl bg-muted px-3.5 py-2.5"
                  : "me-auto whitespace-pre-wrap text-pretty"
              )}
            >
              {item.role === "assistant" ? (
                <p className="mb-2 flex items-center gap-1.5 text-caption text-hollow">
                  <SparklesIcon className="size-3.5" aria-hidden="true" />
                  FigureLab
                </p>
              ) : null}
              {item.content}
            </article>
          ))}

          {!jobMissing && (phase === "generating" || job) && jobId ? (
            <div className="space-y-3">
              <GenerationStatus
                title={
                  job?.status === "canceled"
                    ? "Generation canceled"
                    : job?.status === "failed"
                      ? "Generation did not finish"
                      : imageJob
                        ? jobType === "plot"
                          ? "Preparing your chart"
                          : "Creating your illustration"
                        : "Preparing your flowchart"
                }
                description={
                  job?.provider === "fixture"
                    ? "Fixture provider · stages are durable across reload"
                    : "Stages are durable and resume after reload"
                }
                stages={job?.stages ?? ["Reading your request", "Drafting the figure", "Saving the draft"]}
                activeStage={job?.activeStage ?? 0}
                progress={job?.progress ?? null}
                elapsed={job ? formatJobElapsed(job) : `${elapsed} sec`}
              />
              {jobTerminalFailed ? (
                <div className="flex flex-wrap justify-end gap-2">
                  {!imageJob ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setJobId(null)
                        setIdempotencyKey(crypto.randomUUID())
                        setPhase("review")
                        setError(null)
                      }}
                    >
                      Revise plan
                    </Button>
                  ) : null}
                  {job.retryable ? (
                    <Button type="button" size="sm" onClick={() => void retryJob()}>
                      Retry
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {variantJobIds.length > 0 ? (
            <section aria-label="Illustration variants" className="space-y-3">
              {variantsRunning || variantJobs.length < variantJobIds.length ? (
                <div className="space-y-3">
                  <GenerationStatus
                    title={`Creating ${variantJobIds.length} variants`}
                    description="Each variant is an independent durable job"
                    stages={
                      variantJobs[0]?.stages ?? [
                        "Reading your request",
                        "Rendering the illustration",
                        "Saving the draft",
                      ]
                    }
                    activeStage={
                      variantJobs.length > 0
                        ? Math.min(...variantJobs.map((item) => item.activeStage))
                        : 0
                    }
                    progress={
                      variantJobs.length > 0
                        ? Math.round(
                            variantJobs.reduce((sum, item) => sum + (item.progress ?? 0), 0) /
                              variantJobs.length
                          )
                        : 0
                    }
                    elapsed={formatJobElapsed(variantJobs[0] ?? null)}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => void cancelVariants()}
                    >
                      Cancel all
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-ui font-medium">Pick a variant</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {variantJobs.map((variant, index) =>
                      variant.status === "succeeded" && variant.resultImage ? (
                        <figure key={variant.id} className="space-y-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={variant.resultImage.dataUrl}
                            alt={`Variant ${index + 1} for: ${prompt}`}
                            className="image-outline w-full rounded-lg bg-sidebar"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-caption text-hollow tabular-nums">
                              Variant {index + 1}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void pickVariant(variant)}
                            >
                              Use this one
                            </Button>
                          </div>
                        </figure>
                      ) : (
                        <div
                          key={variant.id}
                          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border/70 p-6 text-center"
                        >
                          <p className="text-caption text-muted-foreground">
                            {variant.safeErrorMessage ?? "This variant did not finish."}
                          </p>
                          {variant.retryable ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void retryVariant(variant.id)}
                            >
                              Retry
                            </Button>
                          ) : null}
                        </div>
                      )
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={discardVariants}>
                      Discard variants
                    </Button>
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {phase === "asking" && (
            <p className="flex items-center gap-2 text-meta text-muted-foreground">
              <LoaderCircleIcon
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Thinking
            </p>
          )}

          {phase === "planning" && (
            <GenerationStatus
              title="Planning your figure"
              description="Review comes next. Nothing is generated until you approve the plan."
              stages={["Reading your request", "Structuring the workflow", "Preparing review"]}
              activeStage={Math.min(2, Math.floor(elapsed / 8))}
              progress={null}
              elapsed={`${elapsed} sec`}
            />
          )}

          {phase === "review" && plan && (
            <FlowchartPlanReview
              plan={plan}
              busy={busy}
              onRevise={() => {
                setPlan(null)
                setJobId(null)
                setPhase("idle")
              }}
              onApprove={approvePlan}
            />
          )}

          {job?.status === "succeeded" && job.safeErrorMessage ? (
            <Alert>
              <AlertTitle>Used offline fixture</AlertTitle>
              <AlertDescription>{job.safeErrorMessage}</AlertDescription>
            </Alert>
          ) : error || jobError || (job?.status === "failed" && job.safeErrorMessage) ? (
            <Alert variant="destructive">
              <AlertTitle>Generation did not finish</AlertTitle>
              <AlertDescription>
                {error ?? jobError ?? job?.safeErrorMessage}
              </AlertDescription>
            </Alert>
          ) : null}

          {jobMissing ? (
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={recoverMissingJob}>
                {plan && jobType === "initial_generation" ? "Return to plan" : "Clear expired job"}
              </Button>
            </div>
          ) : null}

          {latestImage && <GeneratedImageCard image={latestImage} />}
        </div>
      </div>

      {phase !== "review" ? (
        <div className="mx-auto w-full max-w-2xl shrink-0 px-5 pb-6 pt-2">
          {composer}
          <p className="mt-4 text-center text-caption text-hollow">
            FigureLab can make <span className="font-medium">mistakes</span> — check figures
            before you publish.
          </p>
        </div>
      ) : null}
    </div>
  )
}
