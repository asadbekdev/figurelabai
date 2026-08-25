"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FolderIcon,
  FolderPlusIcon,
  HeartIcon,
  ImageIcon,
  PlusIcon,
  Trash2Icon,
} from "@/components/icons"
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
  DialogTrigger,
} from "@/components/align/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/align/dropdown-menu"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import { formatRelativeTime } from "@/lib/product/relative-time"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import type { WorkspaceAsset } from "@/lib/product/workspace-types"
import { cn } from "@/lib/utils"

type LibrarySort = "recent" | "oldest" | "name"
type LibraryFilter = { kind: "all" } | { kind: "favorites" } | { kind: "folder"; id: string }

const sortLabels: Record<LibrarySort, string> = {
  recent: "Recently updated",
  oldest: "Oldest first",
  name: "Name A–Z",
}

function assetLabel(asset: WorkspaceAsset): string {
  return asset.prompt ?? "Generated figure"
}

export function LibraryAssets() {
  const router = useRouter()
  const hydrated = useWorkspaceStore((state) => state.hydrated)
  const allAssets = useWorkspaceStore((state) => state.assets)
  const assets = useMemo(
    () => allAssets.filter((asset) => asset.kind === "generated_asset"),
    [allAssets]
  )
  const projects = useWorkspaceStore((state) => state.projects)
  const folders = useWorkspaceStore((state) => state.folders)
  const createImageProject = useWorkspaceStore((state) => state.createImageProject)
  const createFolder = useWorkspaceStore((state) => state.createFolder)
  const deleteFolder = useWorkspaceStore((state) => state.deleteFolder)
  const setAssetFolder = useWorkspaceStore((state) => state.setAssetFolder)
  const setAssetFavorite = useWorkspaceStore((state) => state.setAssetFavorite)

  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<LibrarySort>("recent")
  const [view, setView] = useState<ViewMode>("grid")
  const [filter, setFilter] = useState<LibraryFilter>({ kind: "all" })
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [folderName, setFolderName] = useState("")
  const [folderError, setFolderError] = useState("")

  const favoritesCount = useMemo(
    () => assets.filter((asset) => asset.favorite).length,
    [assets]
  )

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = assets.filter((asset) => {
      if (filter.kind === "favorites" && !asset.favorite) return false
      if (filter.kind === "folder" && asset.folderId !== filter.id) return false
      if (!needle) return true
      const project = projects.find((item) => item.id === asset.projectId)
      const folder = folders.find((item) => item.id === asset.folderId)
      return (
        (asset.prompt ?? "").toLowerCase().includes(needle) ||
        asset.mimeType.toLowerCase().includes(needle) ||
        (project?.title ?? "").toLowerCase().includes(needle) ||
        (project?.mode ?? "").toLowerCase().includes(needle) ||
        (folder?.name ?? "").toLowerCase().includes(needle)
      )
    })

    return filtered.sort((left, right) => {
      if (sort === "oldest") return left.createdAt.localeCompare(right.createdAt)
      if (sort === "name") {
        return assetLabel(left).localeCompare(assetLabel(right), undefined, {
          sensitivity: "base",
        })
      }
      return right.createdAt.localeCompare(left.createdAt)
    })
  }, [assets, filter, folders, projects, query, sort])

  async function openAsset(asset: WorkspaceAsset) {
    if (asset.projectId) {
      router.push(`/project/${asset.projectId}`)
      return
    }
    const created = await createImageProject({
      title: assetLabel(asset).slice(0, 80),
      mode: "illustration",
      prompt: asset.prompt ?? "Opened from library",
      mimeType: asset.mimeType,
      dataUrl: asset.dataUrl,
    })
    router.push(`/project/${created.project.id}`)
  }

  async function submitFolder() {
    const name = folderName.trim()
    if (!name) {
      setFolderError("Enter a folder name.")
      return
    }
    try {
      const folder = await createFolder(name)
      setFolderName("")
      setFolderDialogOpen(false)
      setFolderError("")
      setFilter({ kind: "folder", id: folder.id })
      toast.success(`Folder "${folder.name}" created`)
    } catch {
      setFolderError("The folder could not be created. Try a different name.")
      toast.error("The folder could not be created.")
    }
  }

  async function removeFolder(folderId: string) {
    try {
      await deleteFolder(folderId)
      setFilter((current) =>
        current.kind === "folder" && current.id === folderId ? { kind: "all" } : current
      )
      toast.success("Folder removed. Its assets stayed in the library.")
    } catch {
      toast.error("The folder could not be removed.")
    }
  }

  const activeFolder = filter.kind === "folder" ? folders.find((f) => f.id === filter.id) : null

  return (
    <PageIndex>
      <PageIndexHeader
        icon={<ImageIcon aria-hidden="true" />}
        title="Library"
        description="Saved figures, folders, and favorites from this browser."
        action={
          <Dialog
            open={folderDialogOpen}
            onOpenChange={(open) => {
              setFolderDialogOpen(open)
              if (!open) setFolderError("")
            }}
          >
            <DialogTrigger asChild>
              <Button type="button" size="xs">
                <FolderPlusIcon aria-hidden="true" />
                New folder
              </Button>
            </DialogTrigger>
          <DialogContent className="rounded-2xl sm:max-w-sm">
            <DialogHeader>
              <DialogIcon>
                <FolderPlusIcon aria-hidden="true" />
              </DialogIcon>
              <DialogTitle>New folder</DialogTitle>
              <DialogDescription>Folders group saved figures in the library.</DialogDescription>
            </DialogHeader>
            <form
              className="contents"
              onSubmit={(event) => {
                event.preventDefault()
                void submitFolder()
              }}
            >
            <div className="space-y-2">
              <Label htmlFor="folder-name">Name</Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(event) => {
                  setFolderName(event.target.value)
                  if (folderError) setFolderError("")
                }}
                placeholder="e.g. Journal figures"
                maxLength={80}
                autoFocus
                aria-invalid={Boolean(folderError)}
                aria-describedby={folderError ? "folder-name-error" : undefined}
              />
              <p id="folder-name-error" className="min-h-5 text-caption text-destructive" role="alert">
                {folderError}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create folder
              </Button>
            </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        }
      />

      <PageIndexSearch
        id="library-search"
        value={query}
        onChange={setQuery}
        placeholder="Search library..."
        label="Search library"
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Library filters">
        <Button
          type="button"
          variant={filter.kind === "all" ? "secondary" : "ghost"}
          size="xs"
          aria-pressed={filter.kind === "all"}
          onClick={() => setFilter({ kind: "all" })}
        >
          All
          <span className="text-hollow tabular-nums">{assets.length}</span>
        </Button>
        <Button
          type="button"
          variant={filter.kind === "favorites" ? "secondary" : "ghost"}
          size="xs"
          aria-pressed={filter.kind === "favorites"}
          onClick={() => setFilter({ kind: "favorites" })}
        >
          <HeartIcon aria-hidden="true" />
          Favorites
          <span className="text-hollow tabular-nums">{favoritesCount}</span>
        </Button>
        {folders.map((folder) => {
          const count = assets.filter((asset) => asset.folderId === folder.id).length
          const active = filter.kind === "folder" && filter.id === folder.id
          return (
            <span key={folder.id} className="inline-flex items-center gap-0.5">
              <Button
                type="button"
                variant={active ? "secondary" : "ghost"}
                size="xs"
                aria-pressed={active}
                onClick={() =>
                  setFilter(active ? { kind: "all" } : { kind: "folder", id: folder.id })
                }
              >
                <FolderIcon aria-hidden="true" />
                {folder.name}
                <span className="text-hollow tabular-nums">{count}</span>
              </Button>
              {active ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove folder ${folder.name}`}
                  onClick={() => void removeFolder(folder.id)}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              ) : null}
            </span>
          )
        })}
      </div>

      {matches.length > 0 ? (
        <PageIndexMeta
          countLabel={
            filter.kind === "favorites"
              ? `Favorites (${matches.length})`
              : activeFolder
                ? `${activeFolder.name} (${matches.length})`
                : `All figures (${matches.length})`
          }
          sort={sort}
          sortLabels={sortLabels}
          onSort={(value) => setSort(value as LibrarySort)}
          extra={<ViewModeToggle value={view} onChange={setView} label="Library layout" />}
        />
      ) : null}

      {activeFolder ? (
        <p className="text-caption text-hollow">
          Removing a folder never deletes its figures.
        </p>
      ) : null}

      {!hydrated ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-[184px] rounded-2xl bg-muted" />
          <div className="h-[184px] rounded-2xl bg-muted" />
        </div>
      ) : matches.length === 0 ? (
        <AppShellEmpty
          headingLevel="h2"
          icon={<ImageIcon aria-hidden="true" />}
          title={
            assets.length === 0
              ? "No figures saved"
              : query.trim()
                ? `No figures match “${query.trim()}”`
              : filter.kind === "favorites"
                ? "No favorites yet"
                : activeFolder
                  ? `${activeFolder.name} is empty`
                  : "No matching figures"
          }
          description={
            assets.length === 0
              ? "Generate a figure from home. Folders, favorites, and search stay available here."
              : query.trim()
                ? "Clear the search to restore figures in the current view."
              : filter.kind === "favorites"
                ? "Mark a figure with the heart to pin it here."
                : "Show all figures or choose a different folder."
          }
          action={
            assets.length === 0 ? (
              <Button asChild>
                <Link href="/">
                  <PlusIcon aria-hidden="true" />
                  New flowchart
                </Link>
              </Button>
            ) : query.trim() ? (
              <Button type="button" variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : filter.kind !== "all" ? (
              <Button type="button" variant="outline" onClick={() => setFilter({ kind: "all" })}>
                Show all figures
              </Button>
            ) : undefined
          }
        />
      ) : view === "list" ? (
        <ul className="flex flex-col gap-1">
          {matches.map((asset) => {
            const project = projects.find((item) => item.id === asset.projectId)
            const assetContent = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.dataUrl}
                  alt=""
                  className="size-10 shrink-0 rounded-lg bg-sidebar object-cover"
                />
                <span className="min-w-0">
                  <span className="block truncate text-ui font-medium">{assetLabel(asset)}</span>
                  <span className="mt-0.5 block truncate text-caption text-hollow">
                    {project?.title ?? "Library figure"}
                  </span>
                </span>
              </>
            )
            return (
              <li key={asset.id} className="flex items-center gap-2 rounded-lg hover:bg-hover-veil">
                {asset.projectId ? (
                  <Link
                    href={`/project/${asset.projectId}`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {assetContent}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    onClick={() => void openAsset(asset)}
                  >
                    {assetContent}
                  </button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="me-1"
                  aria-label={
                    asset.favorite
                      ? `Remove ${assetLabel(asset)} from favorites`
                      : `Mark ${assetLabel(asset)} as favorite`
                  }
                  aria-pressed={asset.favorite}
                  onClick={() => void setAssetFavorite(asset.id, !asset.favorite)}
                >
                  <HeartIcon
                    aria-hidden="true"
                    className={cn(asset.favorite ? "text-foreground" : "text-hollow")}
                  />
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <PageIndexGrid>
          {matches.map((asset) => {
            const project = projects.find((item) => item.id === asset.projectId)
            const assetFolder = folders.find((item) => item.id === asset.folderId)
            return (
              <li key={asset.id}>
                <PageIndexCard
                  media={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.dataUrl}
                      alt=""
                      className="aspect-video w-full rounded-lg bg-muted object-contain"
                    />
                  }
                  title={assetLabel(asset)}
                  description={
                    [project?.title, assetFolder && filter.kind === "all" ? assetFolder.name : null]
                      .filter(Boolean)
                      .join(" · ") || "Library figure"
                  }
                  meta={`Updated ${formatRelativeTime(asset.createdAt)}`}
                  href={asset.projectId ? `/project/${asset.projectId}` : undefined}
                  onOpen={asset.projectId ? undefined : () => void openAsset(asset)}
                  actions={
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={
                          asset.favorite
                            ? `Remove ${assetLabel(asset)} from favorites`
                            : `Mark ${assetLabel(asset)} as favorite`
                        }
                        aria-pressed={asset.favorite}
                        onClick={() => void setAssetFavorite(asset.id, !asset.favorite)}
                      >
                        <HeartIcon
                          aria-hidden="true"
                          className={cn(asset.favorite ? "text-foreground" : "text-hollow")}
                        />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={`Move ${assetLabel(asset)} to a folder`}
                          >
                            <FolderIcon aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuRadioGroup
                            value={asset.folderId ?? "none"}
                            onValueChange={(value) =>
                              void setAssetFolder(asset.id, value === "none" ? null : value)
                            }
                          >
                            <DropdownMenuRadioItem value="none">
                              No folder
                            </DropdownMenuRadioItem>
                            {folders.map((folder) => (
                              <DropdownMenuRadioItem key={folder.id} value={folder.id}>
                                {folder.name}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                          {folders.length === 0 ? (
                            <DropdownMenuItem disabled>
                              Create a folder first
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  }
                />
              </li>
            )
          })}
        </PageIndexGrid>
      )}
    </PageIndex>
  )
}
