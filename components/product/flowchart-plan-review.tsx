"use client"

import { useId, useState } from "react"
import { MessageSquareIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { FigureDirection, FigureOrientation, FigurePlan } from "@/lib/generation/contracts"

export function FlowchartPlanReview({
  plan,
  busy = false,
  onRevise,
  onApprove,
}: {
  plan: FigurePlan
  busy?: boolean
  onRevise: () => void
  onApprove: (plan: FigurePlan) => void
}) {
  const titleId = useId()
  const [draft, setDraft] = useState(plan)

  return (
    <section
      aria-labelledby={titleId}
      className="continuous-corners rounded-2xl bg-surface p-4 surface-outline"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
          <MessageSquareIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={titleId} className="text-ui font-medium">
              Review the generation plan
            </h3>
            <Badge variant="secondary">Needs approval</Badge>
          </div>
          <p className="mt-1 text-meta text-muted-foreground">
            Nothing is generated until you approve this interpretation.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${titleId}-title`}>Title</Label>
          <Input
            id={`${titleId}-title`}
            value={draft.title}
            disabled={busy}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${titleId}-orientation`}>Orientation</Label>
          <Select
            value={draft.orientation}
            disabled={busy}
            onValueChange={(value) =>
              setDraft({ ...draft, orientation: value as FigureOrientation })
            }
          >
            <SelectTrigger id={`${titleId}-orientation`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${titleId}-goal`}>Goal</Label>
          <Textarea
            id={`${titleId}-goal`}
            rows={3}
            value={draft.goal}
            disabled={busy}
            onChange={(event) => setDraft({ ...draft, goal: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${titleId}-direction`}>Primary direction</Label>
          <Select
            value={draft.structure.primaryDirection}
            disabled={busy}
            onValueChange={(value) =>
              setDraft({
                ...draft,
                structure: {
                  ...draft.structure,
                  primaryDirection: value as FigureDirection,
                },
              })
            }
          >
            <SelectTrigger id={`${titleId}-direction`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left-right">Left to right</SelectItem>
              <SelectItem value="top-bottom">Top to bottom</SelectItem>
              <SelectItem value="radial">Radial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Estimated structure</p>
          <p className="text-meta text-muted-foreground tabular-nums">
            {draft.structure.estimatedNodeCount} nodes · {draft.structure.sections.length} sections
            {draft.estimatedSeconds ? ` · about ${draft.estimatedSeconds}s` : ""}
          </p>
        </div>
      </div>

      <ol className="mt-4 space-y-2">
        {draft.structure.sections.map((section) => (
          <li key={section.id} className="rounded-xl bg-surface-subtle px-3 py-2">
            <p className="text-ui font-medium">{section.label}</p>
            <p className="text-meta text-muted-foreground">{section.purpose}</p>
          </li>
        ))}
      </ol>

      {draft.assumptions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Assumptions</p>
          <ul className="mt-1 list-disc space-y-1 ps-5 text-meta text-muted-foreground">
            {draft.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      )}

      {draft.warnings.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Warnings</p>
          <ul className="mt-1 list-disc space-y-1 ps-5 text-meta text-muted-foreground">
            {draft.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onRevise}>
          Revise prompt
        </Button>
        <Button
          type="button"
          disabled={busy || !draft.title.trim() || !draft.goal.trim()}
          onClick={() => onApprove({ ...draft, title: draft.title.trim(), goal: draft.goal.trim() })}
        >
          Approve and generate
        </Button>
      </div>
    </section>
  )
}
