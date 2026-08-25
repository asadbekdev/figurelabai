"use client"

import { GridViewIcon, ListViewIcon } from "@/components/icons"

import { ToggleGroup, ToggleGroupItem } from "@/components/align/toggle-group"

export type ViewMode = "grid" | "list"

export function ViewModeToggle({
  value,
  onChange,
  label,
}: {
  value: ViewMode
  onChange: (value: ViewMode) => void
  label: string
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next === "grid" || next === "list") onChange(next)
      }}
      spacing={1}
      size="sm"
      aria-label={label}
    >
      <ToggleGroupItem value="grid" aria-label="Grid view" className="size-8 px-0">
        <GridViewIcon aria-hidden="true" />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view" className="size-8 px-0">
        <ListViewIcon aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
