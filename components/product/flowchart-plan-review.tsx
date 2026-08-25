"use client"

import { useId, useState } from "react"
import { MessageSquareIcon } from "@/components/icons"

import { Badge } from "@/components/align/badge"
import { Button } from "@/components/align/button"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/align/select"
import { Textarea } from "@/components/align/textarea"
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
  const canApprove =
    Boolean(draft.title.trim()) &&
    Boolean(draft.goal.trim()) &&
    draft.structure.sections.every(
      (section) => Boolean(section.label.trim()) && Boolean(section.purpose.trim())
    ) &&
    draft.assumptions.every((assumption) => Boolean(assumption.trim()))

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-border bg-card p-5 shadow-regular-xs"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
          <MessageSquareIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id={titleId} className="text-lg font-medium leading-6">
              Review the generation plan
            </h3>
            <Badge variant="secondary">Needs approval</Badge>
          </div>
          <p className="mt-1 text-caption text-muted-foreground">
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

      <ol className="mt-4 space-y-3" aria-label="Planned sections">
        {draft.structure.sections.map((section, index) => (
          <li key={section.id} className="space-y-2 rounded-xl bg-muted px-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${titleId}-section-${index}-label`}>
                Section {index + 1} label
              </Label>
              <Input
                id={`${titleId}-section-${index}-label`}
                value={section.label}
                disabled={busy}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    structure: {
                      ...draft.structure,
                      sections: draft.structure.sections.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item
                      ),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${titleId}-section-${index}-purpose`}>
                Section {index + 1} purpose
              </Label>
              <Textarea
                id={`${titleId}-section-${index}-purpose`}
                rows={2}
                value={section.purpose}
                disabled={busy}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    structure: {
                      ...draft.structure,
                      sections: draft.structure.sections.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, purpose: event.target.value } : item
                      ),
                    },
                  })
                }
              />
            </div>
          </li>
        ))}
      </ol>

      {draft.assumptions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Assumptions</p>
          {draft.assumptions.map((assumption, index) => (
            <div key={index} className="space-y-1.5">
              <Label htmlFor={`${titleId}-assumption-${index}`} className="sr-only">
                Assumption {index + 1}
              </Label>
              <Textarea
                id={`${titleId}-assumption-${index}`}
                rows={2}
                value={assumption}
                disabled={busy}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    assumptions: draft.assumptions.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item
                    ),
                  })
                }
              />
            </div>
          ))}
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

      <div className="-mx-5 -mb-5 mt-5 flex flex-wrap items-center justify-end gap-2 rounded-b-2xl border-t border-border bg-muted px-5 py-3">
        <Button type="button" variant="outline" disabled={busy} onClick={onRevise}>
          Revise prompt
        </Button>
        <Button
          type="button"
          disabled={busy || !canApprove}
          onClick={() =>
            onApprove({
              ...draft,
              title: draft.title.trim(),
              goal: draft.goal.trim(),
              structure: {
                ...draft.structure,
                sections: draft.structure.sections.map((section) => ({
                  ...section,
                  label: section.label.trim(),
                  purpose: section.purpose.trim(),
                })),
              },
              assumptions: draft.assumptions.map((assumption) => assumption.trim()),
            })
          }
        >
          Approve and generate
        </Button>
      </div>
    </section>
  )
}
