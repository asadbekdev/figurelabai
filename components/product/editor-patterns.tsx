"use client"

import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  DownloadIcon,
  FrameIcon,
  ImageIcon,
  MousePointer2Icon,
  Redo2Icon,
  ShapesIcon,
  TypeIcon,
  Undo2Icon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function CanvasToolbar() {
  const tools = [
    ["Select", MousePointer2Icon],
    ["Frame", FrameIcon],
    ["Text", TypeIcon],
    ["Shapes", ShapesIcon],
    ["Image", ImageIcon],
  ] as const

  return (
    <div className="flex w-fit items-center gap-1 rounded-xl bg-surface-raised p-1 surface-outline" role="toolbar" aria-label="Canvas tools">
      {tools.map(([label, Icon], index) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <Button
              variant={index === 0 ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={label}
              aria-pressed={index === 0}
            >
              <Icon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
      <Button variant="ghost" size="icon-sm" aria-label="Undo">
        <Undo2Icon aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Redo" disabled>
        <Redo2Icon aria-hidden="true" />
      </Button>
    </div>
  )
}

export function VersionItem({
  version,
  title,
  active = false,
}: {
  version: string
  title: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-start outline-none motion-safe:transition-[background-color,color,scale] motion-safe:duration-150 motion-safe:ease-out active:scale-[0.96] focus-visible:ring-3 focus-visible:ring-ring/50",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
      )}
    >
      <span className="mt-0.5 text-meta font-medium tabular-nums">{version}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-ui font-medium">{title}</span>
        <span className="mt-0.5 flex items-center gap-1 text-caption text-muted-foreground tabular-nums">
          <Clock3Icon className="size-3" aria-hidden="true" /> 2 min ago
        </span>
      </span>
    </button>
  )
}

export function ExportOption({
  title,
  description,
  recommended = false,
}: {
  title: string
  description: string
  recommended?: boolean
}) {
  return (
    <button
      type="button"
      className="continuous-corners flex w-full items-center gap-3 rounded-xl bg-card p-3 text-start outline-none motion-safe:transition-[box-shadow,scale] motion-safe:duration-150 motion-safe:ease-out surface-outline surface-outline-hover active:scale-[0.96] focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
        <DownloadIcon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-ui font-medium">
          {title}
          {recommended && <Badge variant="secondary">Recommended</Badge>}
        </span>
        <span className="mt-0.5 block text-meta text-muted-foreground">{description}</span>
      </span>
      <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  )
}

const checks = [
  { label: "All labels fit at the target size", status: "pass" },
  { label: "Raster assets meet 300 DPI", status: "pass" },
  { label: "Two labels may be too small", status: "warning" },
] as const

export function ReadinessList() {
  return (
    <section aria-labelledby="readiness-title" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 id="readiness-title" className="text-ui font-medium">Publication readiness</h3>
          <p className="mt-0.5 text-meta text-muted-foreground tabular-nums">2 of 3 checks passed</p>
        </div>
        <Badge variant="outline" className="text-warning">Needs review</Badge>
      </div>
      <Progress value={67} aria-label="Publication readiness: 2 of 3 checks passed" />
      <ul className="space-y-2">
        {checks.map((check) => (
          <li key={check.label} className="flex items-start gap-2 text-meta">
            {check.status === "pass" ? (
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            )}
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
