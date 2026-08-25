"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ChartIcon, FlowchartIcon, ImageIcon, Layers3Icon, Loader2Icon } from "@/components/icons"
import { toast } from "sonner"

import { AppShellEmpty } from "@/components/product/app-shell"
import {
  PageIndex,
  PageIndexHeader,
  PageIndexMeta,
  PageIndexSearch,
} from "@/components/product/page-index"
import { Badge } from "@/components/align/badge"
import { Button } from "@/components/align/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/align/dialog"
import { renderFlowchartSvg } from "@/lib/flowchart/svg"
import {
  flowchartTemplates,
  illustrationStarters,
} from "@/lib/flowchart/templates"
import { buildFixtureImage } from "@/lib/generation/providers/fixture-image"
import { renderPlotSvg } from "@/lib/plot/render"
import { plotTemplates } from "@/lib/plot/templates"
import { writeComposerSeed } from "@/lib/product/generation-thread"
import { useWorkspaceStore } from "@/lib/product/workspace-store"

function FlowchartTemplateCard({
  template,
}: {
  template: (typeof flowchartTemplates)[number]
}) {
  const router = useRouter()
  const createFlowchartProject = useWorkspaceStore((state) => state.createFlowchartProject)
  const [creating, setCreating] = useState(false)
  const preview = useMemo(
    () => renderFlowchartSvg(template.build(), { background: "document" }),
    [template]
  )

  async function applyTemplate() {
    setCreating(true)
    try {
      const document = template.build()
      const project = await createFlowchartProject({
        title: document.metadata.title,
        document,
        source: "autosave",
        nameGeneratedVersion: false,
        prompt: `Started from the ${template.title} template.`,
      })
      router.push(`/project/${project.id}`)
    } catch {
      toast.error("The template project could not be created.")
      setCreating(false)
    }
  }

  return (
    <article className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-regular-xs ring-1 ring-border">
      <div
        aria-hidden="true"
        className="pointer-events-none overflow-hidden rounded-lg bg-muted [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: preview.replace(/^<\?xml[^?]*\?>/, "") }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-title-sm">{template.title}</h3>
          <p className="mt-0.5 text-caption text-hollow">{template.description}</p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {template.family}
        </Badge>
      </div>
      <div className="mt-auto flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={creating}
          aria-label={`Use ${template.title} template`}
          onClick={() => void applyTemplate()}
        >
          {creating ? (
            <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <FlowchartIcon aria-hidden="true" />
          )}
          Use template
        </Button>
      </div>
    </article>
  )
}

function PlotTemplateCard({
  template,
}: {
  template: (typeof plotTemplates)[number]
}) {
  const router = useRouter()
  const createPlotProject = useWorkspaceStore((state) => state.createPlotProject)
  const [creating, setCreating] = useState(false)
  const preview = useMemo(() => renderPlotSvg(template.build()), [template])

  async function applyTemplate() {
    setCreating(true)
    try {
      const document = template.build()
      const created = await createPlotProject({
        title: document.metadata.title,
        prompt: `Started from the ${template.title} template.`,
        document,
      })
      router.push(`/project/${created.project.id}`)
    } catch {
      toast.error("The plot template could not be created.")
      setCreating(false)
    }
  }

  return (
    <article className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-regular-xs ring-1 ring-border">
      <div
        aria-hidden="true"
        className="pointer-events-none overflow-hidden rounded-lg bg-muted [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: preview.replace(/^<\?xml[^?]*\?>/, "") }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-title-sm">{template.title}</h3>
          <p className="mt-0.5 text-caption text-hollow">{template.description}</p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {template.family}
        </Badge>
      </div>
      <div className="mt-auto flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={creating}
          aria-label={`Use ${template.title} template`}
          onClick={() => void applyTemplate()}
        >
          {creating ? (
            <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <ChartIcon aria-hidden="true" />
          )}
          Use template
        </Button>
      </div>
    </article>
  )
}

function IllustrationTemplateCard({
  starter,
}: {
  starter: (typeof illustrationStarters)[number]
}) {
  const router = useRouter()
  const createImageProject = useWorkspaceStore((state) => state.createImageProject)
  const [creating, setCreating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const preview = useMemo(() => {
    const image = buildFixtureImage(
      {
        prompt: starter.prompt,
        style: starter.style ?? "publication",
        seed: starter.id,
      },
      "illustration"
    )
    return image.dataUrl
  }, [starter])

  function useStarter() {
    writeComposerSeed({ prompt: starter.prompt, mode: "illustration" })
    router.push("/")
  }

  async function openInCanvas() {
    setCreating(true)
    try {
      const created = await createImageProject({
        title: starter.title,
        mode: "illustration",
        prompt: starter.prompt,
        mimeType: "image/svg+xml",
        dataUrl: preview,
      })
      router.push(`/project/${created.project.id}`)
    } catch {
      toast.error("The illustration project could not be created.")
      setCreating(false)
    }
  }

  return (
    <article className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-regular-xs ring-1 ring-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview}
        alt=""
        className="pointer-events-none h-auto w-full rounded-lg bg-muted"
      />
      <div className="min-w-0">
        <h3 className="text-title-sm">{starter.title}</h3>
        <p className="mt-0.5 text-caption text-hollow">{starter.description}</p>
      </div>
      <div className="mt-auto flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Preview ${starter.title}`}
          onClick={() => setPreviewOpen(true)}
        >
          Preview
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Use ${starter.title} starter`}
          onClick={useStarter}
        >
          Use starter
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={creating}
          aria-label={`Open ${starter.title} in canvas`}
          onClick={() => void openInCanvas()}
        >
          {creating ? (
            <Loader2Icon className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <ImageIcon aria-hidden="true" />
          )}
          Open in canvas
        </Button>
      </div>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{starter.title}</DialogTitle>
            <DialogDescription>
              Fixture preview. Use the starter to edit the prompt, or save this preview as a project.
            </DialogDescription>
          </DialogHeader>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`Preview of ${starter.title}`}
              className="image-outline w-full rounded-lg bg-muted"
            />
            <p className="text-caption text-muted-foreground">{starter.prompt}</p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                aria-label={`Use ${starter.title} starter`}
                onClick={useStarter}
              >
                Use starter
              </Button>
              <Button
                type="button"
                disabled={creating}
                aria-label={`Open ${starter.title} in canvas`}
                onClick={() => void openInCanvas()}
              >
                Open in canvas
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  )
}

type TemplateKind = "all" | "flowchart" | "plot" | "illustration"
type TemplateSort = "recommended" | "name"

const templateSortLabels: Record<TemplateSort, string> = {
  recommended: "Recommended",
  name: "Name A–Z",
}

export function TemplateGallery() {
  const [query, setQuery] = useState("")
  const [kind, setKind] = useState<TemplateKind>("all")
  const [sort, setSort] = useState<TemplateSort>("recommended")

  const needle = query.trim().toLowerCase()
  const filterByQuery = <T extends { title: string; description: string },>(items: readonly T[]) => {
    const filtered = items.filter(
      (item) =>
        !needle ||
        item.title.toLowerCase().includes(needle) ||
        item.description.toLowerCase().includes(needle)
    )
    return sort === "name"
      ? [...filtered].sort((left, right) => left.title.localeCompare(right.title))
      : filtered
  }

  const visibleFlowcharts = kind === "all" || kind === "flowchart" ? filterByQuery(flowchartTemplates) : []
  const visiblePlots = kind === "all" || kind === "plot" ? filterByQuery(plotTemplates) : []
  const visibleIllustrations =
    kind === "all" || kind === "illustration" ? filterByQuery(illustrationStarters) : []
  const matchCount = visibleFlowcharts.length + visiblePlots.length + visibleIllustrations.length
  const resultLabel = kind === "all" ? "templates" : `${kind} templates`

  return (
    <PageIndex>
      <PageIndexHeader
        icon={<Layers3Icon aria-hidden="true" />}
        title="Templates"
        description="Start from a flowchart, plot, or illustration starter instead of a blank prompt."
      />

      <PageIndexSearch
        id="template-search"
        value={query}
        onChange={setQuery}
        placeholder="Search templates..."
        label="Search templates"
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Template type">
        {(
          [
            ["all", "All"],
            ["flowchart", "Flowcharts"],
            ["plot", "Plots"],
            ["illustration", "Illustrations"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={kind === value ? "secondary" : "ghost"}
            size="xs"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <PageIndexMeta
        countLabel={`${resultLabel.charAt(0).toUpperCase()}${resultLabel.slice(1)} (${matchCount})`}
        sort={sort}
        sortLabels={templateSortLabels}
        onSort={(value) => setSort(value as TemplateSort)}
      />

      {matchCount === 0 ? (
        <AppShellEmpty
          headingLevel="h2"
          icon={<Layers3Icon aria-hidden="true" />}
          title={
            query.trim()
              ? `No templates match “${query.trim()}”`
              : `No ${resultLabel} available`
          }
          description="Clear the filters to restore the full template catalog."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("")
                setKind("all")
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : null}

      {visibleFlowcharts.length > 0 ? (
      <section aria-labelledby="flowchart-templates" className="space-y-4">
        <div>
          <h2 id="flowchart-templates" className="text-title-sm">
            Flowchart templates
          </h2>
          <p className="text-caption text-hollow">
            Real editable documents. Using one creates a project you can reshape immediately.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleFlowcharts.map((template) => (
            <FlowchartTemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>
      ) : null}

      {visiblePlots.length > 0 ? (
      <section aria-labelledby="plot-templates" className="space-y-4">
        <div>
          <h2 id="plot-templates" className="text-title-sm">
            Plot templates
          </h2>
          <p className="text-caption text-hollow">
            Live charts with sample data. Using one opens an editable plot project.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {visiblePlots.map((template) => (
            <PlotTemplateCard key={template.id} template={template} />
          ))}
        </div>
      </section>
      ) : null}

      {visibleIllustrations.length > 0 ? (
      <section aria-labelledby="illustration-starters" className="space-y-4">
        <div>
          <h2 id="illustration-starters" className="text-title-sm">
            Illustration starters
          </h2>
          <p className="text-caption text-hollow">
            Fixture previews plus the starter prompt. Use one to generate, or open the preview in
            the canvas.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleIllustrations.map((starter) => (
            <IllustrationTemplateCard key={starter.id} starter={starter} />
          ))}
        </div>
      </section>
      ) : null}
    </PageIndex>
  )
}
