"use client"

import Link from "next/link"
import { ArrowLeftIcon } from "@/components/icons"

import { AppShell, AppShellEmpty, AppShellLoading } from "@/components/product/app-shell"
import { EditorRevisionComposer } from "@/components/product/editor-revision-composer"
import { FlowchartEditorWorkbench } from "@/components/product/flowchart-editor"
import { FlowchartHeaderActions } from "@/components/product/flowchart-header-actions"
import { ImageProjectWorkbench } from "@/components/product/image-project-workbench"
import { PlotEditorWorkbench } from "@/components/product/plot-editor-workbench"
import { ProjectList } from "@/components/product/project-list"
import { WorkbenchGeneration } from "@/components/product/workbench-generation"
import { Button } from "@/components/align/button"
import { useProjectSessionStore } from "@/lib/product/project-session"
import { useProjectPersistence } from "@/lib/product/use-project-persistence"
import { useRecentsStore } from "@/lib/product/recents-store"

function WorkbenchPageView() {
  const newFigureKey = useRecentsStore((state) => state.newFigureKey)

  return (
    <AppShell>
      <WorkbenchGeneration key={newFigureKey} />
    </AppShell>
  )
}

function ProjectsPageView() {
  return (
    <AppShell fill={false} headerLabel="Projects">
      <ProjectList />
    </AppShell>
  )
}

function ProjectEditorBody({ projectId }: { projectId: string }) {
  useProjectPersistence(projectId)
  const sessionProjectId = useProjectSessionStore((state) => state.projectId)
  const missing = useProjectSessionStore((state) => state.missing)
  const loadError = useProjectSessionStore((state) => state.loadError)
  const saveState = useProjectSessionStore((state) => state.saveState)
  const title = useProjectSessionStore((state) => state.title)
  const mode = useProjectSessionStore((state) => state.mode)
  const plotDocument = useProjectSessionStore((state) => state.plotDocument)

  if (missing && sessionProjectId === projectId) {
    return (
      <FigureLabNotFound
        title="Project not found"
        description="That project id does not match a saved editor session."
      />
    )
  }

  if (loadError && sessionProjectId === projectId) {
    return (
      <AppShell fill={false} headerLabel="Project recovery">
        <AppShellEmpty
          title="Project couldn’t be opened"
          description={loadError}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => window.location.reload()}>Reload project</Button>
              <Button variant="outline" asChild>
                <Link href="/projects">Go to projects</Link>
              </Button>
            </div>
          }
        />
      </AppShell>
    )
  }

  if (sessionProjectId !== projectId || saveState === "loading") {
    return <AppShellLoading title="Figure" description="Opening the saved revision." />
  }

  if (mode === "plot" && plotDocument) {
    return (
      <AppShell headerLabel={title || "Plot"} headerHeading>
        <PlotEditorWorkbench />
      </AppShell>
    )
  }

  if (mode === "illustration" || mode === "plot") {
    return (
      <AppShell headerLabel={title || "Figure"} headerHeading>
        <ImageProjectWorkbench />
      </AppShell>
    )
  }

  return (
    <AppShell
      headerLabel={title || "Figure"}
      headerHeading
      headerActions={<FlowchartHeaderActions />}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <FlowchartEditorWorkbench />
        <div className="shrink-0 px-3 pb-3 pt-2 md:px-4">
          <EditorRevisionComposer />
        </div>
      </div>
    </AppShell>
  )
}

function ProjectEditorPageView({ projectId }: { projectId: string }) {
  return <ProjectEditorBody key={projectId} projectId={projectId} />
}

function FigureLabNotFound({ title, description }: { title: string; description: string }) {
  return (
    <AppShell fill={false} headerLabel={title}>
      <AppShellEmpty
        title={title}
        description={description}
        action={
          <Button variant="account" asChild>
            <Link href="/create">
              <ArrowLeftIcon aria-hidden="true" />
              Back to workspace
            </Link>
          </Button>
        }
      />
    </AppShell>
  )
}

function FigureLabLoading({ title, description }: { title: string; description: string }) {
  return <AppShellLoading title={title} description={description} />
}

function FigureLabShell({
  activeHref,
  title,
  subtitle,
  children,
}: {
  activeHref: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  void activeHref
  return (
    <AppShell fill={false} headerLabel={title}>
      {subtitle ? (
        <div className="mb-6">
          <p className="text-meta text-muted-foreground">{subtitle}</p>
        </div>
      ) : null}
      {children}
    </AppShell>
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
