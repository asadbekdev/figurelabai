"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FlowchartIcon, FolderIcon, MoreHorizontalIcon, PencilIcon, PlusIcon } from "@/components/icons"
import { toast } from "sonner"

import { AppShellEmpty } from "@/components/product/app-shell"
import {
  PageIndex,
  PageIndexCard,
  PageIndexGrid,
  PageIndexHeader,
  PageIndexMeta,
  PageIndexSearch,
} from "@/components/product/page-index"
import { ViewModeToggle, type ViewMode } from "@/components/product/view-mode-toggle"
import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from "@/components/align/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/align/dropdown-menu"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import { formatRelativeTime } from "@/lib/product/relative-time"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import type { ProjectRecord } from "@/lib/product/workspace-types"

type ProjectSort = "recent" | "oldest" | "name" | "mode"

const sortLabels: Record<ProjectSort, string> = {
  recent: "Recently opened",
  oldest: "Oldest first",
  name: "Name A–Z",
  mode: "Type",
}

function modeLabel(project: ProjectRecord): string {
  if (project.mode === "flowchart") return "Flowchart"
  if (project.mode === "illustration") return "Illustration"
  return "Plot"
}

function statusLabel(project: ProjectRecord): string {
  if (project.status === "ready") return "Ready"
  if (project.status === "generating") return "Generating"
  if (project.status === "failed") return "Needs attention"
  return "Draft"
}

export function ProjectList() {
  const router = useRouter()
  const hydrated = useWorkspaceStore((state) => state.hydrated)
  const workspaceError = useWorkspaceStore((state) => state.error)
  const projects = useWorkspaceStore((state) => state.projects)
  const assets = useWorkspaceStore((state) => state.assets)
  const renameProject = useWorkspaceStore((state) => state.renameProject)
  const archiveProject = useWorkspaceStore((state) => state.archiveProject)
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<ProjectSort>("recent")
  const [view, setView] = useState<ViewMode>("grid")
  const [renaming, setRenaming] = useState<ProjectRecord | null>(null)
  const [archiving, setArchiving] = useState<ProjectRecord | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [renameBusy, setRenameBusy] = useState(false)
  const [renameError, setRenameError] = useState("")
  const [archiveBusy, setArchiveBusy] = useState(false)
  const [archiveError, setArchiveError] = useState("")

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? projects.filter(
          (project) =>
            project.title.toLowerCase().includes(needle) ||
            project.mode.toLowerCase().includes(needle)
        )
      : [...projects]
    return filtered.sort((left, right) => {
      if (sort === "oldest") return left.lastOpenedAt.localeCompare(right.lastOpenedAt)
      if (sort === "name") {
        return left.title.localeCompare(right.title, undefined, { sensitivity: "base" })
      }
      if (sort === "mode") {
        return modeLabel(left).localeCompare(modeLabel(right)) || right.lastOpenedAt.localeCompare(left.lastOpenedAt)
      }
      return right.lastOpenedAt.localeCompare(left.lastOpenedAt)
    })
  }, [projects, query, sort])

  function thumbnailFor(project: ProjectRecord): string | null {
    if (!project.currentAssetId) return null
    return assets.find((asset) => asset.id === project.currentAssetId)?.dataUrl ?? null
  }

  async function submitRename() {
    if (!renaming || renameBusy) return
    const title = draftTitle.trim()
    if (!title) {
      setRenameError("Enter a project title.")
      return
    }

    setRenameBusy(true)
    setRenameError("")
    try {
      await renameProject(renaming.id, title)
      setRenaming(null)
      toast.success("Project renamed")
    } catch {
      setRenameError("The project could not be renamed. Try again.")
      toast.error("The project could not be renamed.")
    } finally {
      setRenameBusy(false)
    }
  }

  async function submitArchive() {
    if (!archiving || archiveBusy) return

    setArchiveBusy(true)
    setArchiveError("")
    try {
      await archiveProject(archiving.id)
      setArchiving(null)
      toast.success("Project archived")
    } catch {
      setArchiveError("The project could not be archived. Try again.")
      toast.error("The project could not be archived.")
    } finally {
      setArchiveBusy(false)
    }
  }

  if (!hydrated) {
    return (
      <PageIndex>
        <PageIndexHeader
          icon={<FolderIcon aria-hidden="true" />}
          title="Projects"
          description="Easily manage and explore all your active projects in one place."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-[184px] rounded-2xl bg-muted" />
          <div className="h-[184px] rounded-2xl bg-muted" />
        </div>
      </PageIndex>
    )
  }

  if (workspaceError) {
    return (
      <PageIndex>
        <PageIndexHeader
          icon={<FolderIcon aria-hidden="true" />}
          title="Projects"
          description="Easily manage and explore all your active projects in one place."
        />
        <AppShellEmpty
          headingLevel="h2"
          icon={<FolderIcon aria-hidden="true" />}
          title="Projects couldn’t be opened"
          description={workspaceError}
          action={<Button onClick={() => window.location.reload()}>Reload projects</Button>}
        />
      </PageIndex>
    )
  }

  if (projects.length === 0) {
    return (
      <PageIndex>
        <PageIndexHeader
          icon={<FolderIcon aria-hidden="true" />}
          title="Projects"
          description="Easily manage and explore all your active projects in one place."
          action={
            <Button size="xs" asChild>
              <Link href="/">
                <PlusIcon aria-hidden="true" />
                Create project
              </Link>
            </Button>
          }
        />
        <AppShellEmpty
          headingLevel="h2"
          icon={<FolderIcon aria-hidden="true" />}
          title="No figures yet"
          description="Projects appear here after you start a generation."
          action={
            <Button asChild>
              <Link href="/">
                <PlusIcon aria-hidden="true" />
                New flowchart
              </Link>
            </Button>
          }
        />
      </PageIndex>
    )
  }

  return (
    <PageIndex>
      <PageIndexHeader
        icon={<FolderIcon aria-hidden="true" />}
        title="Projects"
        description="Easily manage and explore all your active projects in one place."
        action={
          <Button size="xs" asChild>
            <Link href="/">
              <PlusIcon aria-hidden="true" />
              Create project
            </Link>
          </Button>
        }
      />

      <PageIndexSearch
        id="project-search"
        value={query}
        onChange={setQuery}
        placeholder="Search projects..."
        label="Search projects"
      />

      {matches.length > 0 ? (
        <PageIndexMeta
          countLabel={`All projects (${matches.length})`}
          sort={sort}
          sortLabels={sortLabels}
          onSort={(value) => setSort(value as ProjectSort)}
          extra={<ViewModeToggle value={view} onChange={setView} label="Project layout" />}
        />
      ) : null}

      {matches.length === 0 ? (
        <AppShellEmpty
          headingLevel="h2"
          icon={<FolderIcon aria-hidden="true" />}
          title={`No projects match “${query.trim()}”`}
          description="Clear the search to restore every project."
          action={
            <Button type="button" variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : view === "grid" ? (
        <PageIndexGrid>
          {matches.map((project) => {
            const thumb = thumbnailFor(project)
            return (
              <li key={project.id}>
                <PageIndexCard
                  href={`/project/${project.id}`}
                  icon={<FolderIcon aria-hidden="true" />}
                  preview={thumb ?? undefined}
                  title={project.title}
                  description={modeLabel(project)}
                  meta={`${statusLabel(project)} · Updated ${formatRelativeTime(project.lastOpenedAt)}`}
                  actions={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Actions for ${project.title}`}
                        >
                          <MoreHorizontalIcon aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenaming(project)
                            setDraftTitle(project.title)
                            setRenameError("")
                          }}
                        >
                          <PencilIcon aria-hidden="true" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/project/${project.id}`)}>
                          Open
                        </DropdownMenuItem>
                        {project.id === "demo" ? null : (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setArchiving(project)
                                setArchiveError("")
                              }}
                            >
                              Archive
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                />
              </li>
            )
          })}
        </PageIndexGrid>
      ) : (
        <ul className="flex flex-col gap-1">
          {matches.map((project) => {
            const thumb = thumbnailFor(project)
            return (
            <li key={project.id}>
              <div className="flex items-center gap-1 rounded-lg hover:bg-hover-veil">
                <Link
                  href={`/project/${project.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="size-10 shrink-0 rounded-lg bg-sidebar object-cover" />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar text-hollow">
                      <FlowchartIcon className="size-4" aria-hidden="true" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-ui font-medium">{project.title}</span>
                    <span className="mt-0.5 block truncate text-caption text-hollow tabular-nums">
                      {modeLabel(project)} · {statusLabel(project)} · {formatRelativeTime(project.lastOpenedAt)}
                    </span>
                  </span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="me-1"
                      aria-label={`Actions for ${project.title}`}
                    >
                      <MoreHorizontalIcon aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setRenaming(project)
                        setDraftTitle(project.title)
                        setRenameError("")
                      }}
                    >
                      <PencilIcon aria-hidden="true" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/project/${project.id}`)}>
                      Open
                    </DropdownMenuItem>
                    {project.id === "demo" ? null : (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            setArchiving(project)
                            setArchiveError("")
                          }}
                        >
                          Archive
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={Boolean(renaming)}
        onOpenChange={(open) => {
          if (!open && !renameBusy) {
            setRenaming(null)
            setRenameError("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogIcon>
              <PencilIcon aria-hidden="true" />
            </DialogIcon>
            <DialogTitle>Rename project</DialogTitle>
            <DialogDescription>The title appears in Recents, Search, and the editor header.</DialogDescription>
          </DialogHeader>
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault()
              void submitRename()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="project-title">Title</Label>
              <Input
                id="project-title"
                value={draftTitle}
                aria-invalid={Boolean(renameError)}
                aria-describedby={renameError ? "project-title-error" : undefined}
                onChange={(event) => {
                  setDraftTitle(event.target.value)
                  if (renameError) setRenameError("")
                }}
              />
              {renameError ? (
                <p id="project-title-error" className="text-caption text-destructive" role="alert">
                  {renameError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={renameBusy}
                onClick={() => setRenaming(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renameBusy}>
                {renameBusy ? "Saving…" : "Save title"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(archiving)}
        onOpenChange={(open) => {
          if (!open && !archiveBusy) {
            setArchiving(null)
            setArchiveError("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogIcon>
              <FolderIcon aria-hidden="true" />
            </DialogIcon>
            <DialogTitle>Archive project?</DialogTitle>
            <DialogDescription>
              {archiving
                ? `“${archiving.title}” will leave Projects and Recents. Its saved data stays in this browser.`
                : "The project will leave Projects and Recents."}
            </DialogDescription>
          </DialogHeader>
          {archiveError ? (
            <p className="text-caption text-destructive" role="alert">
              {archiveError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={archiveBusy}
              onClick={() => setArchiving(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={archiveBusy}
              onClick={() => void submitArchive()}
            >
              {archiveBusy ? "Archiving…" : "Archive project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageIndex>
  )
}
