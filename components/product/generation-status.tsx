"use client"

import {
  CheckIcon,
  CircleDashedIcon,
  LoaderCircleIcon,
} from "@/components/icons"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { Progress } from "@/components/align/progress"
import { cn } from "@/lib/utils"

const defaultStages = [
  "Reading your request",
  "Planning the layout",
  "Rendering the figure",
  "Checking labels and output",
]

type StageState = "complete" | "active" | "pending"

function AnimatedStageIcon({ state }: { state: StageState }) {
  const reduceMotion = useReducedMotion()
  const iconMotion = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { scale: 0.25, opacity: 0, filter: "blur(4px)" },
        animate: { scale: 1, opacity: 1, filter: "blur(0px)" },
        exit: { scale: 0.25, opacity: 0, filter: "blur(4px)" },
        transition: { type: "spring" as const, duration: 0.3, bounce: 0 },
      }

  return (
    <span className="relative grid size-4 shrink-0 place-items-center" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.span
          key={state}
          className={cn(
            "absolute inset-0 grid place-items-center",
            state === "complete" && "text-success",
            state === "active" && "text-primary"
          )}
          {...iconMotion}
        >
          {state === "complete" ? (
            <CheckIcon className="size-4" />
          ) : state === "active" ? (
            <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <CircleDashedIcon className="size-4" />
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function GenerationStatus({
  activeStage = 2,
  elapsed = "28 sec",
  className,
  title = "Creating your figure",
  description = "Usually 30–60 seconds",
  stages = defaultStages,
  progress = null,
}: {
  activeStage?: number
  elapsed?: string
  className?: string
  title?: string
  description?: string
  stages?: readonly string[]
  progress?: number | null
}) {
  const value =
    progress == null
      ? null
      : Math.min(100, Math.max(0, progress))

  return (
    <section
      aria-labelledby="generation-status-title"
      aria-busy="true"
      className={cn("space-y-4 rounded-2xl border border-border bg-card p-5 shadow-regular-xs", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id="generation-status-title" className="text-ui font-medium">
            {title}
          </h3>
          <p className="mt-1 text-caption text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="text-caption text-hollow tabular-nums">{elapsed}</span>
      </div>
      {value != null ? (
        <Progress value={value} aria-label="Figure generation progress" className="h-1.5" />
      ) : null}
      <ol className="space-y-2">
        {stages.map((stage, index) => {
          const complete = index < activeStage
          const active = index === activeStage
          const state: StageState = complete ? "complete" : active ? "active" : "pending"
          return (
            <li
              key={stage}
              className={cn(
                "flex items-center gap-2 text-meta motion-safe:transition-colors motion-safe:duration-150",
                !complete && !active && "text-muted-foreground"
              )}
              aria-current={active ? "step" : undefined}
            >
              <AnimatedStageIcon state={state} />
              {stage}
            </li>
          )
        })}
      </ol>
      <div className="sr-only" role="status">
        {stages[activeStage]}
      </div>
    </section>
  )
}
