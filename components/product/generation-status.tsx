import {
  CheckIcon,
  CircleDashedIcon,
  LoaderCircleIcon,
} from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const defaultStages = [
  "Reading your request",
  "Planning the layout",
  "Rendering the figure",
  "Checking labels and output",
]

export function GenerationStatus({
  activeStage = 2,
  elapsed = "28 sec",
  className,
  title = "Creating your figure",
  description = "Usually 30–60 seconds",
  stages = defaultStages,
}: {
  activeStage?: number
  elapsed?: string
  className?: string
  title?: string
  description?: string
  stages?: readonly string[]
}) {
  const progress = ((activeStage + 0.45) / stages.length) * 100

  return (
    <section
      aria-labelledby="generation-status-title"
      aria-busy="true"
      className={cn("continuous-corners space-y-4 rounded-xl bg-surface-subtle p-4", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id="generation-status-title" className="text-ui font-medium">
            {title}
          </h3>
          <p className="mt-1 text-meta text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="text-meta text-muted-foreground tabular-nums">{elapsed}</span>
      </div>
      <Progress value={progress} aria-label="Figure generation progress" />
      <ol className="grid gap-2 sm:grid-cols-2">
        {stages.map((stage, index) => {
          const complete = index < activeStage
          const active = index === activeStage
          return (
            <li
              key={stage}
              className={cn(
                "flex items-center gap-2 text-meta",
                !complete && !active && "text-muted-foreground"
              )}
              aria-current={active ? "step" : undefined}
            >
              {complete ? (
                <CheckIcon className="size-4 text-success" aria-hidden="true" />
              ) : active ? (
                <LoaderCircleIcon className="size-4 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <CircleDashedIcon className="size-4" aria-hidden="true" />
              )}
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
