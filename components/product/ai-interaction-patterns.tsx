"use client"

import { useId, useState } from "react"
import {
  CheckIcon,
  ChevronDownIcon,
  CircleDashedIcon,
  FileTextIcon,
  LinkIcon,
  LoaderCircleIcon,
  MessageSquareIcon,
  SparklesIcon,
  TypeIcon,
  WandSparklesIcon,
  WrapTextIcon,
} from "@/components/icons"

import { Badge } from "@/components/align/badge"
import { Button } from "@/components/align/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/align/collapsible"
import { Label } from "@/components/align/label"
import { RadioGroup, RadioGroupItem } from "@/components/align/radio-group"
import { cn } from "@/lib/utils"

const activitySteps = [
  { label: "Read methods-notes.pdf", state: "complete" },
  { label: "Arrange the three-step workflow", state: "active" },
  { label: "Check labels and source links", state: "queued" },
] as const

export function GenerationActivity({ className }: { className?: string }) {
  return (
    <Collapsible
      defaultOpen
      className={cn("group rounded-lg border border-border bg-sidebar p-4", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background">
            <LoaderCircleIcon
              className="size-4 animate-spin text-foreground motion-reduce:animate-none"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-ui font-medium">Creating your figure</p>
            <p className="text-meta text-muted-foreground tabular-nums">
              Layout in progress · 28 sec
            </p>
          </div>
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Toggle generation activity">
            <ChevronDownIcon
              className="transition-transform group-data-[state=closed]:-rotate-90"
              aria-hidden="true"
            />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="pt-4">
        <ol className="space-y-2 border-s ps-4">
          {activitySteps.map((step) => (
            <li key={step.label} className="flex items-center gap-2 text-meta">
              {step.state === "complete" ? (
                <CheckIcon className="size-4 text-foreground" aria-hidden="true" />
              ) : step.state === "active" ? (
                <LoaderCircleIcon
                  className="size-4 animate-spin text-foreground motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <CircleDashedIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span className={step.state === "queued" ? "text-muted-foreground" : undefined}>
                {step.label}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Active generation tools">
          <Badge variant="outline"><FileTextIcon aria-hidden="true" /> Source read</Badge>
          <Badge variant="outline"><SparklesIcon aria-hidden="true" /> Layout active</Badge>
          <Badge variant="outline"><LinkIcon aria-hidden="true" /> Citations queued</Badge>
        </div>
      </CollapsibleContent>
      <div className="sr-only" role="status" aria-live="polite">
        Arranging the three-step workflow
      </div>
    </Collapsible>
  )
}

const approvalOptions = [
  {
    value: "single",
    title: "One continuous flow",
    description: "Best for a compact methods figure.",
  },
  {
    value: "grouped",
    title: "Three grouped stages",
    description: "Adds stronger visual separation.",
  },
] as const

export function GenerationApproval({ className }: { className?: string }) {
  const titleId = useId()
  const [choice, setChoice] = useState("single")
  const [submitted, setSubmitted] = useState(false)

  return (
    <section
      aria-labelledby={titleId}
      className={cn("rounded-lg border border-border bg-background p-4", className)}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
          <MessageSquareIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={titleId} className="text-ui font-medium">Choose the layout direction</h3>
            <Badge variant="secondary">Needs input</Badge>
          </div>
          <p className="mt-1 text-meta text-muted-foreground">
            Your source supports two equally accurate structures.
          </p>
        </div>
      </div>

      <RadioGroup value={choice} onValueChange={setChoice} className="mt-4">
        {approvalOptions.map((option) => {
          const optionId = `${titleId}-${option.value}`
          return (
            <Label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-hover-veil",
                choice === option.value && "bg-muted"
              )}
            >
              <RadioGroupItem id={optionId} value={option.value} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block text-ui font-medium">{option.title}</span>
                <span className="block text-meta font-normal text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </Label>
          )
        })}
      </RadioGroup>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost">Ask another question</Button>
        <Button type="button" onClick={() => setSubmitted(true)}>
          Continue with selection
        </Button>
      </div>
      <div className="sr-only" role="status" aria-live="polite">
        {submitted ? "Layout direction approved" : ""}
      </div>
    </section>
  )
}

export function SourceContextCard({ className }: { className?: string }) {
  return (
    <article className={cn("rounded-lg border border-border bg-background p-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
            <FileTextIcon className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-ui font-medium">methods-notes.pdf</h3>
            <p className="text-meta text-muted-foreground">Pages 3–4 · 2 cited passages</p>
          </div>
        </div>
        <Badge variant="secondary"><CheckIcon aria-hidden="true" /> Verified</Badge>
      </div>
      <blockquote className="mt-4 border-s-2 border-foreground ps-3 text-meta leading-relaxed">
        Amplification follows extraction, then the signal is normalized before analysis.
      </blockquote>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-caption text-muted-foreground">Used in nodes 2–4</span>
        <Button type="button" variant="ghost" size="sm">Open source</Button>
      </div>
    </article>
  )
}

const selectionActions = [
  { label: "Rewrite", icon: TypeIcon },
  { label: "Simplify", icon: WrapTextIcon },
  { label: "Improve", icon: WandSparklesIcon },
] as const

export function SelectionActions({ className }: { className?: string }) {
  const [lastAction, setLastAction] = useState("")

  return (
    <div className={cn("space-y-2", className)}>
      <div
        role="toolbar"
        aria-label="Selected label actions"
        className="flex w-fit max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background p-1"
      >
        {selectionActions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.label}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLastAction(action.label)}
            >
              <Icon aria-hidden="true" />
              {action.label}
            </Button>
          )
        })}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="More selection actions"
        >
          <span aria-hidden="true">•••</span>
        </Button>
      </div>
      <p className="min-h-4 text-caption text-muted-foreground" role="status" aria-live="polite">
        {lastAction ? `${lastAction} action selected` : "Select an action for the active label"}
      </p>
    </div>
  )
}
