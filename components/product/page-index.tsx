import type { ReactNode } from "react"
import Link from "next/link"
import { SearchIcon } from "@/components/icons"

import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/align/select"
import { cn } from "@/lib/utils"

export function PageIndex({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[700px] flex-col gap-6">{children}</div>
}

export function PageIndexHeader({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5">
      <span className="grid size-12 place-items-center rounded-lg bg-accent text-primary [&_svg]:size-7">
        {icon}
      </span>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-heading text-balance">{title}</h1>
          <p className="text-pretty text-caption text-muted-foreground">{description}</p>
        </div>
        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
      </div>
    </div>
  )
}

export function PageIndexSearch({
  id,
  value,
  onChange,
  placeholder,
  label,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  return (
    <div className="relative">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <SearchIcon
        className="pointer-events-none absolute start-2.5 top-1/2 size-5 -translate-y-1/2 text-hollow"
        aria-hidden="true"
      />
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 bg-muted ps-9 shadow-none ring-0 hover:bg-muted hover:ring-0 focus-visible:ring-foreground"
      />
    </div>
  )
}

export function PageIndexMeta({
  countLabel,
  sort,
  sortLabels,
  onSort,
  sortLabel = "Sort by",
  extra,
}: {
  countLabel: string
  sort: string
  sortLabels: Record<string, string>
  onSort: (value: string) => void
  sortLabel?: string
  extra?: ReactNode
}) {
  const keys = Object.keys(sortLabels)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-ui text-hollow tabular-nums">{countLabel}</p>
      <div className="flex items-center gap-2">
        {extra}
        <div className="flex items-center gap-1.5">
          <span className="text-ui text-hollow">{sortLabel}</span>
          <Select value={sort} onValueChange={onSort}>
            <SelectTrigger
              aria-label={sortLabel}
              size="sm"
              className="h-auto min-h-0 gap-0.5 border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {keys.map((value) => (
                <SelectItem key={value} value={value}>
                  {sortLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

export function PageIndexGrid({ children }: { children: ReactNode }) {
  return <ul className="grid gap-4 sm:grid-cols-2">{children}</ul>
}

export function PageIndexCard({
  href,
  onOpen,
  icon,
  preview,
  media,
  title,
  description,
  meta,
  actions,
}: {
  href?: string
  onOpen?: () => void
  icon?: ReactNode
  preview?: string
  media?: ReactNode
  title: string
  description?: string
  meta: string
  actions?: ReactNode
}) {
  const inner = (
    <>
      {media ??
        (preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-6 shrink-0 rounded-md object-cover" />
        ) : (
          <span className="text-hollow [&_svg]:size-6">{icon}</span>
        ))}
      <div className="flex w-full min-w-0 flex-col gap-1">
        <h2 className="text-title-sm text-pretty">{title}</h2>
        {description ? (
          <p className="text-pretty text-caption text-hollow">{description}</p>
        ) : null}
      </div>
      <p className="mt-auto text-xs font-medium leading-4 text-hollow tabular-nums">{meta}</p>
    </>
  )

  return (
    <article
      className={cn(
        "relative flex min-h-[184px] flex-col rounded-2xl bg-card p-6 shadow-regular-xs",
        "ring-1 ring-border"
      )}
    >
      {href && !onOpen ? (
        <Link
          href={href}
          className="flex min-h-[136px] flex-1 flex-col gap-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {inner}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-[136px] flex-1 flex-col gap-6 text-start outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {inner}
        </button>
      )}
      {actions ? <div className="absolute end-3 top-3 flex items-center gap-1">{actions}</div> : null}
    </article>
  )
}
