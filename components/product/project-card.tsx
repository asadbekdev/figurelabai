"use client"

import { MoreHorizontalIcon, PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProjectCard() {
  return (
    <Card className="surface-outline-hover">
      <CardContent className="px-3 pt-3">
        <div className="image-outline overflow-hidden rounded-lg bg-surface-subtle p-5">
          <svg
            viewBox="0 0 440 220"
            className="aspect-[2/1] w-full"
            role="img"
            aria-labelledby="project-preview-title project-preview-description"
          >
            <title id="project-preview-title">PCR workflow preview</title>
            <desc id="project-preview-description">
              Three connected stages from sample collection to amplification and analysis.
            </desc>
            <path d="M130 110H175M265 110H310" stroke="var(--chart-1)" strokeWidth="3" />
            {[40, 175, 310].map((x, index) => (
              <g key={x}>
                <rect
                  x={x}
                  y="70"
                  width="90"
                  height="80"
                  rx="12"
                  fill={index === 1 ? "var(--accent)" : "var(--surface-raised)"}
                  stroke="var(--border)"
                />
                <circle cx={x + 45} cy="96" r="10" fill={`var(--chart-${index + 1})`} />
                <rect x={x + 18} y="116" width="54" height="5" rx="2.5" fill="var(--foreground)" opacity=".75" />
                <rect x={x + 28} y="129" width="34" height="4" rx="2" fill="var(--muted-foreground)" opacity=".55" />
              </g>
            ))}
          </svg>
        </div>
      </CardContent>
      <CardHeader>
        <CardTitle className="truncate">Three-step PCR workflow</CardTitle>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label="Project actions">
                <MoreHorizontalIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <PencilIcon aria-hidden="true" /> Rename project
              </DropdownMenuItem>
              <DropdownMenuItem>Duplicate project</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Delete project</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
        <p className="text-meta text-muted-foreground tabular-nums">Edited today · 4 versions</p>
      </CardHeader>
    </Card>
  )
}
