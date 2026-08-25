"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronRightIcon,
  FolderIcon,
  ImageIcon,
  Layers3Icon,
  MenuIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
  VectorSquareIcon,
  XIcon,
} from "@/components/icons"

import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/align/badge"
import { Button } from "@/components/align/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/align/command"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/align/sheet"
import { useGenerationSessionStore } from "@/lib/generation/session-store"
import { clearComposerSeed, clearGenerationThread } from "@/lib/product/generation-thread"
import { useRecentsStore } from "@/lib/product/recents-store"
import { formatRelativeTime } from "@/lib/product/relative-time"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import type { ProjectRecord } from "@/lib/product/workspace-types"
import { cn } from "@/lib/utils"

type RecentItem = {
  id: string
  title: string
  preview: string
  href: string
  openedAt: string
}

function projectToRecent(project: ProjectRecord): RecentItem {
  const mode = project.mode === "flowchart" ? "Flowchart" : project.mode
  return {
    id: project.id,
    title: project.title,
    preview: `${mode} · ${formatRelativeTime(project.lastOpenedAt)}`,
    href: `/project/${project.id}`,
    openedAt: project.lastOpenedAt,
  }
}

function recentsBucket(iso: string): "Recents" | "Yesterday" | "Earlier" {
  const opened = new Date(iso)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startYesterday = new Date(startToday)
  startYesterday.setDate(startYesterday.getDate() - 1)
  if (opened >= startToday) return "Recents"
  if (opened >= startYesterday) return "Yesterday"
  return "Earlier"
}

const primaryNav = [
  { id: "projects", label: "Projects", icon: FolderIcon, href: "/projects" as const },
  { id: "library", label: "Library", icon: ImageIcon, href: "/library" as const },
]

const pinnedNav: Array<{
  id: string
  label: string
  icon: typeof FolderIcon
  href: "/templates" | "/vector-canvas"
  status: "Preview" | "Later"
}> = [
  {
    id: "templates",
    label: "Templates",
    icon: Layers3Icon,
    href: "/templates" as const,
    status: "Preview",
  },
  {
    id: "vector",
    label: "Vector canvas",
    icon: VectorSquareIcon,
    href: "/vector-canvas" as const,
    status: "Later",
  },
]

function RecentRow({
  item,
  active,
  onSelect,
}: {
  item: RecentItem
  active: boolean
  onSelect?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-lg px-1.5 py-1.5 text-ui text-muted-foreground outline-none motion-safe:transition-[background-color,color] motion-safe:duration-150 motion-safe:ease-out",
        "hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "bg-sidebar-accent text-sidebar-foreground"
      )}
    >
      <span className="block truncate">{item.title}</span>
    </Link>
  )
}

function NavRow({
  href,
  label,
  icon: Icon,
  active,
  status,
  onClick,
}: {
  href: string
  label: string
  icon: typeof FolderIcon
  active: boolean
  status?: "Preview" | "Later"
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-lg px-1.5 text-ui text-muted-foreground outline-none motion-safe:transition-[background-color,color] motion-safe:duration-150 motion-safe:ease-out",
        "hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "bg-muted text-sidebar-foreground"
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {status ? <Badge variant="secondary">{status}</Badge> : null}
      {active ? <ChevronRightIcon className="size-4 shrink-0 text-hollow" aria-hidden="true" /> : null}
    </Link>
  )
}

function SidebarBody({
  collapsed,
  mobile = false,
  onNavigate,
  onSearch,
  onNewFigure,
  onHide,
}: {
  collapsed?: boolean
  mobile?: boolean
  onNavigate?: () => void
  onSearch: () => void
  onNewFigure: () => void
  onHide?: () => void
}) {
  const pathname = usePathname()
  const projects = useWorkspaceStore((state) => state.projects)
  const recents = projects.map(projectToRecent)
  const grouped = useMemo(() => {
    const buckets: Record<"Recents" | "Yesterday" | "Earlier", RecentItem[]> = {
      Recents: [],
      Yesterday: [],
      Earlier: [],
    }
    for (const item of recents) {
      buckets[recentsBucket(item.openedAt)].push(item)
    }
    return (["Recents", "Yesterday", "Earlier"] as const).filter((key) => buckets[key].length > 0)
      .map((key) => ({ key, items: buckets[key] }))
  }, [recents])

  if (collapsed) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center gap-3 px-2 py-5">
        <Link
          href="/create"
          onClick={onNavigate}
          className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="FigureLab home"
        >
          F
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Search projects"
          onClick={onSearch}
        >
          <SearchIcon aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-primary"
          aria-label="New flowchart"
          onClick={onNewFigure}
        >
          <PlusIcon aria-hidden="true" />
        </Button>
        {primaryNav.map((row) => {
          const Icon = row.icon
          const active = pathname.startsWith(row.href)
          return (
            <Button
              key={row.id}
              variant="ghost"
              size="icon-sm"
              asChild
              aria-label={row.label}
              aria-current={active ? "page" : undefined}
              className={active ? "bg-sidebar-accent" : undefined}
            >
              <Link href={row.href} onClick={onNavigate}>
                <Icon aria-hidden="true" />
              </Link>
            </Button>
          )
        })}
        <div className="mt-auto flex flex-col items-center gap-2">
          <ThemeToggle />
          <span
            className="grid size-8 place-items-center rounded-full bg-muted text-caption font-medium"
            aria-hidden="true"
          >
            FL
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-4 pb-3.5 pt-5",
        mobile ? "px-5" : "px-3.5"
      )}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between ps-1.5">
          <Link
            href="/create"
            onClick={onNavigate}
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="FigureLab home"
          >
            F
          </Link>
          {onHide ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8 rounded-lg"
              aria-label={mobile ? "Close navigation" : "Collapse sidebar"}
              onClick={onHide}
            >
              {mobile ? <XIcon aria-hidden="true" /> : <PanelLeftIcon aria-hidden="true" />}
            </Button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-lg bg-muted px-2 text-start text-ui text-hollow outline-none hover:bg-hover-veil focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <SearchIcon className="size-5" aria-hidden="true" />
          Search…
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4">
          <nav aria-label="FigureLab" className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => {
                onNewFigure()
                onNavigate?.()
              }}
              className="flex h-8 items-center gap-2 rounded-lg px-1.5 text-ui text-primary outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="grid size-5 place-items-center rounded-full bg-accent text-primary" aria-hidden="true">
                <PlusIcon className="size-3.5" />
              </span>
              New flowchart
            </button>
            {primaryNav.map((row) => (
              <NavRow
                key={row.id}
                href={row.href}
                label={row.label}
                icon={row.icon}
                active={pathname.startsWith(row.href)}
                onClick={onNavigate}
              />
            ))}
          </nav>

          <div className={cn("h-px bg-sidebar-border", mobile ? "-mx-5" : "mx-1.5")} />

          <div className="flex flex-col gap-2">
            <p className="px-1.5 text-caption text-hollow">Pinned</p>
            <nav aria-label="Pinned" className="flex flex-col gap-1">
              {pinnedNav.map((row) => (
                <NavRow
                  key={row.id}
                  href={row.href}
                  label={row.label}
                  icon={row.icon}
                  active={pathname.startsWith(row.href)}
                  status={row.status}
                  onClick={onNavigate}
                />
              ))}
            </nav>
          </div>

          <div className={cn("h-px bg-sidebar-border", mobile ? "-mx-5" : "mx-1.5")} />

          {grouped.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="px-1.5 text-caption text-hollow">Recents</p>
              <p className="px-1.5 py-1.5 text-caption text-hollow">No figures yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {grouped.map((group) => (
                <div key={group.key} className="flex flex-col gap-1">
                  <p className="px-1.5 text-caption text-hollow">{group.key}</p>
                  {group.items.map((item) => (
                    <RecentRow
                      key={item.id}
                      item={item}
                      active={pathname === item.href && item.href !== "/"}
                      onSelect={onNavigate}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={cn("mt-auto flex flex-col gap-3", mobile && "-mx-5 gap-0")}>
        {!mobile ? <div className="mx-1.5 h-px bg-sidebar-border" /> : null}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-1.5 py-1",
            mobile && "rounded-none border-t border-sidebar-border px-5 pb-1 pt-5"
          )}
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-ui"
            aria-hidden="true"
          >
            FL
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-ui">Local workspace</p>
            <Link
              href="/api"
              onClick={onNavigate}
              className="truncate text-caption text-hollow outline-none hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Local API
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

function breadcrumbFor(pathname: string, headerLabel?: string) {
  if (headerLabel) {
    if (pathname.startsWith("/project/")) return { parent: "Projects", current: headerLabel }
    return { parent: "FigureLab", current: headerLabel }
  }
  if (pathname.startsWith("/project/")) return { parent: "Projects", current: "Figure" }
  if (pathname === "/library") return { parent: "FigureLab", current: "Library" }
  if (pathname.startsWith("/vector-canvas")) return { parent: "FigureLab", current: "Vector canvas" }
  if (pathname === "/projects") return { parent: "FigureLab", current: "Projects" }
  if (pathname === "/templates") return { parent: "FigureLab", current: "Templates" }
  if (pathname === "/api") return { parent: "FigureLab", current: "Local API" }
  return { parent: "FigureLab", current: "New flowchart" }
}

export function AppShell({
  children,
  fill = true,
  headerLabel,
  headerHeading = false,
  headerActions,
}: {
  children: React.ReactNode
  fill?: boolean
  headerLabel?: string
  headerHeading?: boolean
  headerActions?: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const startNewFigure = useRecentsStore((state) => state.startNewFigure)
  const resetSession = useGenerationSessionStore((state) => state.resetSession)
  const hydrateWorkspace = useWorkspaceStore((state) => state.hydrate)
  const projects = useWorkspaceStore((state) => state.projects)
  const recents = projects.map(projectToRecent)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    void hydrateWorkspace()
  }, [hydrateWorkspace])

  const crumb = breadcrumbFor(pathname, headerLabel)
  const HeaderTitle = headerHeading ? "h1" : "p"

  function newFigure() {
    resetSession()
    clearGenerationThread()
    clearComposerSeed()
    startNewFigure()
    setMobileOpen(false)
    router.push("/create")
  }

  return (
    <div className="safe-area-shell h-svh overflow-hidden bg-muted">
      <a
        href="#figurelab-main"
        className="fixed start-3 top-3 z-[100] -translate-y-16 rounded-lg bg-background px-3 py-2 text-ui shadow-overlay outline-none motion-safe:transition-transform motion-safe:duration-150 focus:translate-y-0 focus-visible:shadow-button-important-focus"
      >
        Skip to content
      </a>
      <div className="flex h-full overflow-hidden bg-sidebar md:rounded-[28px]">
        <aside
          className={cn(
            "hidden h-full shrink-0 flex-col bg-sidebar motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out md:flex",
            desktopOpen ? "w-[272px]" : "w-20"
          )}
        >
          <div
            className={cn(
              "flex h-full min-h-0 flex-col motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out",
              desktopOpen ? "w-[272px]" : "w-20"
            )}
          >
            <SidebarBody
              collapsed={!desktopOpen}
              onSearch={() => setSearchOpen(true)}
              onNewFigure={newFigure}
              onHide={() => setDesktopOpen(false)}
            />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-1.5 ps-0 max-md:p-0">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-background max-md:rounded-none max-md:border-0">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
            <div className="flex min-w-0 items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="Open sidebar"
                  onClick={() => setMobileOpen(true)}
                >
                  <MenuIcon aria-hidden="true" />
                </Button>
                <SheetContent
                  side="left"
                  className="bg-sidebar p-0 data-[side=left]:w-full data-[side=left]:max-w-none data-[side=left]:sm:w-[390px]"
                  showCloseButton={false}
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>FigureLab</SheetTitle>
                    <SheetDescription>Navigate figures, recents, and library.</SheetDescription>
                  </SheetHeader>
                  <SidebarBody
                    mobile
                    onNavigate={() => setMobileOpen(false)}
                    onSearch={() => {
                      setMobileOpen(false)
                      setSearchOpen(true)
                    }}
                    onNewFigure={newFigure}
                    onHide={() => setMobileOpen(false)}
                  />
                </SheetContent>
              </Sheet>

              {!desktopOpen && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hidden md:inline-flex"
                  aria-label="Expand sidebar"
                  onClick={() => setDesktopOpen(true)}
                >
                  <PanelLeftIcon aria-hidden="true" />
                </Button>
              )}

              <HeaderTitle className="flex min-w-0 items-center gap-1 text-ui">
                <span className="truncate text-hollow max-sm:hidden">{crumb.parent}</span>
                <span className="text-hollow max-sm:hidden" aria-hidden="true">
                  /
                </span>
                <span className="truncate text-muted-foreground">{crumb.current}</span>
              </HeaderTitle>
            </div>

            <div className="flex shrink-0 items-center gap-2 max-sm:[&_button]:size-8 max-sm:[&_button]:px-0 max-sm:[&_button]:text-[0px] max-sm:[&_button_svg]:size-4">
              {headerActions}
            </div>
          </header>

            <main
              id="figurelab-main"
              tabIndex={-1}
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col",
                fill ? "overflow-hidden" : "overflow-y-auto px-5 pb-6"
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search"
        description="Find a saved project or jump to a page."
        className="rounded-2xl sm:max-w-lg"
      >
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            <CommandEmpty>No matching projects.</CommandEmpty>
            <CommandGroup heading="Go to">
              <CommandItem
                onSelect={() => {
                  setSearchOpen(false)
                  newFigure()
                }}
              >
                New flowchart
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setSearchOpen(false)
                  router.push("/projects")
                }}
              >
                Projects
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setSearchOpen(false)
                  router.push("/library")
                }}
              >
                Library
              </CommandItem>
            </CommandGroup>
            {recents.length > 0 ? (
              <CommandGroup heading="Recents">
                {recents.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.preview}`}
                    onSelect={() => {
                      setSearchOpen(false)
                      router.push(item.href)
                    }}
                  >
                    {item.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}

export function AppShellLoading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <AppShell fill={false} headerLabel={title}>
      <div className="mx-auto w-full max-w-xl space-y-3">
        <div className="h-3 w-24 rounded-lg bg-muted" />
        <div className="h-8 w-56 rounded-lg bg-muted" />
        <p className="text-meta text-muted-foreground">{description}</p>
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    </AppShell>
  )
}

export function AppShellEmpty({
  title,
  description,
  action,
  icon,
  headingLevel = "h1",
}: {
  title: string
  description: string
  action?: React.ReactNode
  icon?: React.ReactNode
  headingLevel?: "h1" | "h2"
}) {
  const Heading = headingLevel

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      {icon ? (
        <span className="mb-4 grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground [&_svg]:size-6">
          {icon}
        </span>
      ) : null}
      <Heading className="text-title text-balance">{title}</Heading>
      <p className="mt-2 max-w-md text-body text-pretty text-muted-foreground">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
