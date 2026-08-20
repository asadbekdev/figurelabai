"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  BellIcon,
  CircleArrowRightIcon,
  FolderIcon,
  HouseIcon,
  Layers3Icon,
  MenuIcon,
  PlusIcon,
  Share2Icon,
  SparklesIcon,
  SquareKanbanIcon,
  SquareStackIcon,
  UserRoundIcon,
} from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { demoFlowchartDocument } from "@/lib/flowchart/fixture"
import { FlowchartEditorWorkbench } from "@/components/product/flowchart-editor"
import { FlowchartExportDialog } from "@/components/product/flowchart-export-dialog"

import {
  PromptComposer,
} from "."

type NavItem = {
  href: string
  label: string
  icon: typeof HouseIcon
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: HouseIcon },
  { href: "/projects", label: "Projects", icon: SquareKanbanIcon },
  { href: "/library", label: "Library", icon: FolderIcon },
  { href: "/vector-canvas", label: "Vector Canvas", icon: SquareStackIcon },
  { href: "/invitation", label: "Refer & Earn", icon: Share2Icon },
]

function NavRail({ activeHref, onNavigate }: { activeHref: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="FigureLab navigation" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = activeHref === item.href
        const Icon = item.icon
        return (
          <Button
            key={item.href}
            asChild
            variant={active ? "default" : "ghost"}
            size="icon-sm"
            className={cn(
              "relative overflow-hidden rounded-full",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
            aria-current={active ? "page" : undefined}
            aria-label={item.label}
            onClick={onNavigate}
          >
            <Link href={item.href} title={item.label}>
              <Icon aria-hidden="true" />
              <span className="sr-only">{item.label}</span>
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

function FigureLabShell({
  activeHref,
  title,
  subtitle,
  children,
  action,
  hero = false,
}: {
  activeHref: string
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
  hero?: boolean
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="safe-area-shell min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-[88rem] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Open navigation">
                  <MenuIcon aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[min(18rem,calc(100vw-1rem))] sm:max-w-none"
              >
                <SheetHeader className="pb-2">
                  <SheetTitle>FigureLab</SheetTitle>
                  <SheetDescription>Navigate between the workspace, projects, and library.</SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-4">
                  <NavRail activeHref={activeHref} onNavigate={() => setMobileNavOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Layers3Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="truncate text-ui font-medium">FigureLab</span>
            </Link>
          </div>

          <div className="hidden min-w-0 items-center gap-1.5 md:flex">
            <Badge variant="outline" className="me-1 tabular-nums">
              200 credits
            </Badge>
            <Button variant="outline" size="sm">
              Upgrade
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Notifications">
              <BellIcon aria-hidden="true" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Open account menu">
              <UserRoundIcon aria-hidden="true" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[88rem] gap-0 lg:grid-cols-[4rem_minmax(0,1fr)]">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] border-e border-border/70 px-2.5 py-4 lg:block">
          <NavRail activeHref={activeHref} />
        </aside>

        <div className="min-w-0">
          <div className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
            {!hero && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-title font-medium text-balance">{title}</h1>
                  {subtitle && (
                    <p className="mt-1 text-meta text-muted-foreground">{subtitle}</p>
                  )}
                </div>
                {action}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

type TemplatePreviewKind = "flowchart" | "architecture" | "cycle" | "timeline"

function TemplatePreview({ kind }: { kind: TemplatePreviewKind }) {
  if (kind === "flowchart") {
    return (
      <svg viewBox="0 0 320 160" className="h-32 w-full" role="img" aria-hidden="true">
        <rect x="20" y="64" width="66" height="32" rx="16" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <path d="M86 80H112" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <rect x="112" y="64" width="66" height="32" rx="6" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <path d="M178 80H204" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <path d="M228 56L254 80L228 104L202 80Z" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <path d="M254 80H282" fill="none" stroke="var(--accent-foreground)" strokeWidth="1.5" />
        <path d="M228 104V128H120" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="4 4" />
        <rect x="266" y="64" width="34" height="32" rx="16" fill="var(--accent)" stroke="var(--accent-foreground)" strokeWidth="1.5" />
      </svg>
    )
  }
  if (kind === "architecture") {
    return (
      <svg viewBox="0 0 320 160" className="h-32 w-full" role="img" aria-hidden="true">
        <rect x="70" y="18" width="180" height="28" rx="6" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <path d="M160 46V64" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <rect x="46" y="64" width="108" height="28" rx="6" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <rect x="166" y="64" width="108" height="28" rx="6" fill="var(--accent)" stroke="var(--accent-foreground)" strokeWidth="1.5" />
        <path d="M100 92V110M220 92V110" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <rect x="70" y="110" width="180" height="28" rx="6" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      </svg>
    )
  }
  if (kind === "cycle") {
    return (
      <svg viewBox="0 0 320 160" className="h-32 w-full" role="img" aria-hidden="true">
        <path d="M132 44A52 44 0 0 1 214 62" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <path d="M214 100A52 44 0 0 1 132 116" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <path d="M104 96A52 44 0 0 1 108 58" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <path d="M214 62l-8-2M132 116l8 2M108 58l-2 8" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="126" y="20" width="68" height="28" rx="14" fill="var(--accent)" stroke="var(--accent-foreground)" strokeWidth="1.5" />
        <rect x="212" y="66" width="68" height="28" rx="14" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        <rect x="60" y="112" width="132" height="28" rx="14" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 320 160" className="h-32 w-full" role="img" aria-hidden="true">
      <path d="M30 106H290" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <circle cx="66" cy="106" r="5" fill="var(--accent-foreground)" />
      <circle cx="136" cy="106" r="5" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <circle cx="206" cy="106" r="5" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <circle cx="276" cy="106" r="5" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <path d="M66 100V64M136 100V78M206 100V52M276 100V70" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <rect x="38" y="44" width="56" height="20" rx="6" fill="var(--accent)" stroke="var(--accent-foreground)" strokeWidth="1.5" />
      <rect x="108" y="58" width="56" height="20" rx="6" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <rect x="178" y="32" width="56" height="20" rx="6" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <rect x="248" y="50" width="56" height="20" rx="6" fill="var(--surface-raised)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
    </svg>
  )
}

function TemplateCard({
  title,
  description,
  tag,
  preview,
  selected = false,
}: {
  title: string
  description: string
  tag: string
  preview: TemplatePreviewKind
  selected?: boolean
}) {
  return (
    <Card className={cn("surface-outline-hover h-full", selected && "ring-1 ring-ring/30")}>
      <CardContent className="space-y-4 p-4">
        <div className="image-outline overflow-hidden rounded-md bg-surface-subtle p-3">
          <TemplatePreview kind={preview} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="truncate text-base">{title}</CardTitle>
            <Badge variant="outline">{tag}</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            Preview
          </Button>
          <Button variant={selected ? "secondary" : "default"} size="sm" className="flex-1">
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function WorkbenchPageView() {
  const templates = [
    {
      title: "Flowchart-040",
      description: "A compact methods layout for procedural steps.",
      tag: "Flowchart",
      preview: "flowchart" as const,
      selected: true,
    },
    {
      title: "Model Architecture-021",
      description: "Layered blocks and signal paths for system diagrams.",
      tag: "Architecture",
      preview: "architecture" as const,
    },
    {
      title: "Cycle Diagram-012",
      description: "Circular process layouts for repeated workflows.",
      tag: "Cycle",
      preview: "cycle" as const,
    },
    {
      title: "Timeline-009",
      description: "Linear progressions for phased experiments.",
      tag: "Timeline",
      preview: "timeline" as const,
    },
  ]

  return (
    <FigureLabShell activeHref="/" title="Workbench" hero>
      <div className="space-y-10">
        <section className="mx-auto max-w-3xl space-y-3 pt-6 text-center sm:pt-10">
          <h1 className="text-display font-medium text-balance">
            Turn research into publication-ready figures.
          </h1>
          <p className="mx-auto max-w-xl text-body text-pretty text-muted-foreground">
            Describe the logic, attach your sources, and refine an editable figure without
            leaving the workspace.
          </p>
        </section>

        <section className="mx-auto max-w-3xl">
          <PromptComposer className="shadow-surface" />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-title-sm font-medium">Templates</h3>
              <p className="mt-1 text-meta text-muted-foreground">
                Start from a structured layout or inspect one before generation.
              </p>
            </div>
            <Button variant="ghost" size="sm">
              All
            </Button>
          </div>
          <Tabs defaultValue="recommended" className="w-full">
            <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-full border border-border/70 bg-surface p-1 [&_[data-slot=tabs-trigger]]:rounded-full [&_[data-slot=tabs-trigger]]:px-3">
              <TabsTrigger value="recommended">Recommended</TabsTrigger>
              <TabsTrigger value="flowchart">Flowchart</TabsTrigger>
              <TabsTrigger value="architecture">Model Architecture</TabsTrigger>
              <TabsTrigger value="cycle">Cycle Diagram</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {templates.map((template) => (
              <TemplateCard key={template.title} {...template} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-title-sm font-medium">Recent projects</h3>
              <p className="mt-1 text-meta text-muted-foreground">
                Run a generation to populate your recent work.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">See all</Link>
            </Button>
          </div>
          <Empty className="border border-dashed border-border/80 bg-surface/70 py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SparklesIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No figures yet</EmptyTitle>
              <EmptyDescription>
                Describe a workflow, attach a source, and your first project will appear here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button>
                <PlusIcon aria-hidden="true" />
                Create your first figure
              </Button>
            </EmptyContent>
          </Empty>
        </section>
      </div>
    </FigureLabShell>
  )
}

function ProjectsPageView() {
  return (
    <FigureLabShell
      activeHref="/projects"
      title="Projects"
      subtitle="View and continue your past figures."
      action={
        <Button>
          <PlusIcon aria-hidden="true" />
          New project
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            Start date
          </Button>
          <Button variant="outline" size="sm">
            End date
          </Button>
          <Button variant="secondary" size="sm">
            Grid view
          </Button>
          <Button variant="ghost" size="sm">
            List view
          </Button>
          <Select defaultValue="oldest">
            <SelectTrigger className="h-9 w-44 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="recent">Most recent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Empty className="border border-dashed border-border/80 bg-surface/70 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SquareKanbanIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No figures yet</EmptyTitle>
            <EmptyDescription>
              Projects will appear here after you start a generation from the workbench.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/">
                <CircleArrowRightIcon aria-hidden="true" />
                Create your first figure
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </FigureLabShell>
  )
}

function ProjectEditorPageView({ projectId }: { projectId: string }) {
  const projectTitle = useMemo(
    () =>
      projectId === "demo"
        ? demoFlowchartDocument.metadata.title
        : projectId.replace(/[-_]+/g, " "),
    [projectId]
  )
  return (
    <FigureLabShell
      activeHref="/projects"
      title={projectTitle}
      subtitle="Flowchart editor"
      action={
        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeftIcon aria-hidden="true" />
              Projects
            </Link>
          </Button>
          <FlowchartExportDialog />
        </div>
      }
    >
      <FlowchartEditorWorkbench />
    </FigureLabShell>
  )
}

function FigureLabNotFound({ title, description }: { title: string; description: string }) {
  return (
    <div className="safe-area-shell min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh max-w-4xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <Empty className="border border-dashed border-border/80 bg-surface/70 py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers3Icon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/">
                <ArrowLeftIcon aria-hidden="true" />
                Back to home
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  )
}

function FigureLabLoading({ title, description }: { title: string; description: string }) {
  return (
    <div className="safe-area-shell min-h-svh bg-background">
      <div className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-muted" />
              <div className="h-8 w-56 rounded-full bg-muted" />
            </div>
            <div className="h-10 w-36 rounded-full bg-muted" />
          </div>
          <Card className="surface-outline">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 w-2/3 rounded-full bg-muted" />
              <div className="h-4 w-full rounded-full bg-muted" />
              <div className="h-4 w-5/6 rounded-full bg-muted" />
              <div className="h-64 rounded-2xl bg-muted" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export {
  FigureLabShell,
  FigureLabLoading,
  FigureLabNotFound,
  ProjectsPageView,
  ProjectEditorPageView,
  WorkbenchPageView,
}
