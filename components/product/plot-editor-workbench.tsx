"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  DatabaseIcon,
  DownloadIcon,
  Loader2Icon,
  Settings2Icon,
} from "@/components/icons"
import { toast } from "sonner"

import { GenerationStatus } from "@/components/product/generation-status"
import { ProjectThreadView } from "@/components/product/project-thread"
import { ProjectVersionsPanel } from "@/components/product/project-versions-panel"
import { SaveToLibraryButton } from "@/components/product/save-to-library-button"
import { PlotShareDialog } from "@/components/product/share-dialog"
import { PromptComposer } from "@/components/product/prompt-composer"
import { Alert, AlertDescription, AlertTitle } from "@/components/align/alert"
import { Button } from "@/components/align/button"
import { Checkbox } from "@/components/align/checkbox"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/align/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/align/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/align/toggle-group"
import { Input } from "@/components/align/input"
import { Label } from "@/components/align/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/align/select"
import { Switch } from "@/components/align/switch"
import { Textarea } from "@/components/align/textarea"
import { downloadArtifact, exportFilename } from "@/lib/flowchart/export"
import {
  createPlotJpg,
  createPlotPdf,
  createPlotPng,
  createPlotPptx,
  createPlotPython,
  createPlotSvg,
} from "@/lib/plot/export"
import { isNumericColumn, parseTable, suggestPlotEncoding, tableToCsv } from "@/lib/plot/parse"
import { addSecondPanel, removeSecondPanel, setPlotLayout } from "@/lib/plot/panels"
import { plotTypeRequirement } from "@/lib/plot/requirements"
import { plotPalettes } from "@/lib/plot/palette"
import { renderPlotSvg } from "@/lib/plot/render"
import type { PlotChartType, PlotLayout, PlotPaletteId } from "@/lib/plot/schema"
import { usePlotEditorStore } from "@/lib/plot/store"
import { useProjectSessionStore } from "@/lib/product/project-session"
import { formatJobElapsed } from "@/lib/product/use-generation-job"
import { useImageRevision } from "@/lib/product/use-image-revision"
import { getWorkspaceRepository } from "@/lib/product/workspace-runtime"
import { useWorkspaceStore } from "@/lib/product/workspace-store"
import { cn } from "@/lib/utils"

const chartTypes: Array<{ value: PlotChartType; label: string }> = [
  { value: "bar", label: "Bar" },
  { value: "stacked", label: "Stacked" },
  { value: "line", label: "Line" },
  { value: "scatter", label: "Scatter" },
  { value: "area", label: "Area" },
  { value: "pie", label: "Pie" },
  { value: "heatmap", label: "Heatmap" },
  { value: "box", label: "Box" },
  { value: "volcano", label: "Volcano" },
  { value: "survival", label: "Survival" },
]

export function PlotEditorWorkbench() {
  const projectId = useProjectSessionStore((state) => state.projectId)
  const title = useProjectSessionStore((state) => state.title)
  const thread = useProjectSessionStore((state) => state.thread)
  const asset = useProjectSessionStore((state) => state.asset)
  const revision = useProjectSessionStore((state) => state.revision)
  const documentId = useProjectSessionStore((state) => state.documentId)
  const saveState = useProjectSessionStore((state) => state.saveState)
  const setSession = useProjectSessionStore((state) => state.setSession)
  const renameProject = useWorkspaceStore((state) => state.renameProject)

  const document = usePlotEditorStore((state) => state.document)
  const changeSerial = usePlotEditorStore((state) => state.changeSerial)
  const loadDocument = usePlotEditorStore((state) => state.loadDocument)
  const updateDocument = usePlotEditorStore((state) => state.updateDocument)

  const { job, jobId, busy, displayError, revise, cancelJob, retryJob } = useImageRevision({
    projectId,
    mode: "plot",
    title,
  })

  const [dataOpen, setDataOpen] = useState(false)
  const [dataDraft, setDataDraft] = useState("")
  const [dataError, setDataError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(false)

  useEffect(() => {
    if (usePlotEditorStore.getState().changeSerial > 0) return
    const plot = useProjectSessionStore.getState().plotDocument
    if (plot) loadDocument(plot)
  }, [documentId, loadDocument, projectId])

  useEffect(() => {
    return () => {
      usePlotEditorStore.getState().reset()
    }
  }, [])

  function commitDocument(updater: (doc: NonNullable<typeof document>) => NonNullable<typeof document>) {
    updateDocument(updater)
  }

  function setChartType(nextType: PlotChartType) {
    usePlotEditorStore.getState().updateDocument((doc) => ({
      ...doc,
      ...suggestPlotEncoding(nextType, doc.columns, doc),
      chartType: nextType,
    }))
  }

  useEffect(() => {
    if (changeSerial === 0 || !projectId) return
    const latest = usePlotEditorStore.getState().document
    if (!latest) return
    setSession({ saveState: "dirty", plotDocument: latest })
    const timer = window.setTimeout(() => {
      void (async () => {
        const current = usePlotEditorStore.getState().document
        if (!current) return
        try {
          const repository = await getWorkspaceRepository()
          const baseRevision = useProjectSessionStore.getState().revision
          setSession({ saveState: "saving" })
          const result = await repository.saveDocument(projectId, current, baseRevision, "autosave")
          if (!result.ok) {
            const stored = result.conflict.stored.content
            if (stored.kind === "plot") loadDocument(stored)
            setSession({
              saveState: "saved",
              revision: result.conflict.stored.revision,
              documentId: result.conflict.stored.id,
              lastSavedAt: result.conflict.stored.createdAt,
            })
            toast.error("The stored chart was newer, so it was reloaded.")
            return
          }
          setSession({
            saveState: "saved",
            revision: result.revision,
            documentId: result.documentId,
            lastSavedAt: result.savedAt,
            plotDocument: current,
          })
          if (current.metadata.title !== useProjectSessionStore.getState().title) {
            await renameProject(projectId, current.metadata.title)
          }
        } catch {
          setSession({ saveState: "offline" })
        }
      })()
    }, 900)
    return () => window.clearTimeout(timer)
  }, [changeSerial, loadDocument, projectId, renameProject, setSession])

  const svg = useMemo(() => (document ? renderPlotSvg(document) : null), [document])

  if (!document || !svg) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
        <p className="text-meta text-muted-foreground">This plot has no editable data.</p>
      </div>
    )
  }

  const numericColumns = document.columns
    .map((_, index) => index)
    .filter((index) => isNumericColumn({ columns: document.columns, rows: document.rows }, index))

  function applyDataDraft() {
    const table = parseTable(dataDraft)
    if (!table) {
      setDataError("Paste at least a header row and one data row, separated by commas or tabs.")
      return
    }
    const numeric = table.columns
      .map((_, index) => index)
      .filter((index) => isNumericColumn(table, index))
    if (numeric.length === 0) {
      setDataError("The table needs at least one numeric column for the y axis.")
      return
    }
    const current = usePlotEditorStore.getState().document
    if (!current) return
    const xIndex = table.columns.findIndex((_, index) => !numeric.includes(index))
    const resolvedX = xIndex >= 0 ? xIndex : 0
    const series = numeric.filter((index) => index !== resolvedX).slice(0, 8)
    commitDocument((doc) => ({
      ...doc,
      columns: table.columns,
      rows: table.rows,
      xColumnIndex: resolvedX,
      seriesColumnIndices: series.length > 0 ? series : [resolvedX === 0 ? 1 : 0],
      xLabel: table.columns[resolvedX],
      yLabel: table.columns[series[0] ?? 0] ?? doc.yLabel,
    }))
    setDataError(null)
    setDataOpen(false)
    toast.success("Data updated")
  }

  async function exportChart(format: "svg" | "png" | "jpg" | "pdf" | "pptx" | "py") {
    const current = usePlotEditorStore.getState().document
    if (!current) return
    setExporting(format)
    try {
      if (format === "svg") {
        downloadArtifact(
          new Blob([createPlotSvg(current)], { type: "image/svg+xml;charset=utf-8" }),
          exportFilename(current.metadata.title, "svg")
        )
      } else if (format === "py") {
        downloadArtifact(
          new Blob([createPlotPython(current)], { type: "text/x-python;charset=utf-8" }),
          exportFilename(current.metadata.title, "py")
        )
      } else if (format === "png") {
        downloadArtifact(
          await createPlotPng(current, 2),
          exportFilename(current.metadata.title, "png")
        )
      } else if (format === "jpg") {
        downloadArtifact(
          await createPlotJpg(current, 2),
          exportFilename(current.metadata.title, "jpg")
        )
      } else if (format === "pptx") {
        downloadArtifact(
          await createPlotPptx(current, 2),
          exportFilename(current.metadata.title, "pptx")
        )
      } else {
        downloadArtifact(
          await createPlotPdf(current, 2),
          exportFilename(current.metadata.title, "pdf")
        )
      }
      toast.success(format === "py" ? "Python script downloaded" : `${format.toUpperCase()} export is ready`)
    } catch {
      toast.error("The export could not be created in this browser.")
    } finally {
      setExporting(null)
    }
  }

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "dirty"
        ? "Unsaved changes"
        : saveState === "offline"
          ? "Offline — changes stay in this browser"
          : "Saved"

  const dataDialog = (
    <Dialog
      open={dataOpen}
      onOpenChange={(next) => {
        setDataOpen(next)
        if (next) {
          setDataDraft(tableToCsv(document.columns, document.rows))
          setDataError(null)
        }
      }}
    >
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogIcon>
            <DatabaseIcon aria-hidden="true" />
          </DialogIcon>
          <DialogTitle>Edit chart data</DialogTitle>
          <DialogDescription>
            Comma or tab separated. The first row holds column names.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="plot-xlsx">Import Excel</Label>
          <Input
            id="plot-xlsx"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (!file) return
              void (async () => {
                const { parseXlsxFile } = await import("@/lib/plot/xlsx")
                const table = await parseXlsxFile(file)
                if (!table) {
                  setDataError("That workbook could not be read. Use the first sheet with a header row.")
                  return
                }
                setDataDraft(tableToCsv(table.columns, table.rows))
                setDataError(null)
              })()
            }}
          />
        </div>
        <Textarea
          rows={10}
          value={dataDraft}
          onChange={(event) => setDataDraft(event.target.value)}
          className="max-h-72 overflow-y-auto font-mono text-caption"
          aria-label="Chart data as CSV"
        />
        {dataError ? (
          <p className="text-caption text-muted-foreground" role="alert">
            {dataError}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" onClick={applyDataDraft}>
            Apply data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  const renderInspectorFields = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label id="plot-chart-type-label">Chart type</Label>
        <div
          role="radiogroup"
          aria-labelledby="plot-chart-type-label"
          className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
        >
          {chartTypes.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              data-chart-type={option.value}
              aria-checked={document.chartType === option.value}
              className={cn(
                "rounded-md px-2.5 py-1 text-caption text-muted-foreground outline-none motion-safe:transition-[background-color,color,box-shadow] motion-safe:duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                document.chartType === option.value &&
                  "bg-card text-foreground shadow-regular-xs"
              )}
              onClick={() => setChartType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {plotTypeRequirement(document.chartType) ? (
          <p className="text-caption text-muted-foreground">
            {plotTypeRequirement(document.chartType)}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label id="plot-palette-label">Journal palette</Label>
        <div
          role="radiogroup"
          aria-labelledby="plot-palette-label"
          className="flex flex-wrap gap-1.5"
        >
          {plotPalettes.map((palette) => (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={document.paletteId === palette.id}
              aria-label={palette.label}
              title={palette.label}
              onClick={() =>
                commitDocument((doc) => ({
                  ...doc,
                  paletteId: palette.id as PlotPaletteId,
                }))
              }
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2 py-1.5 outline-none motion-safe:transition-[border-color] motion-safe:duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
                document.paletteId === palette.id
                  ? "border-foreground"
                  : "border-border/70"
              )}
            >
              {palette.series.slice(0, 4).map((color) => (
                <span
                  key={color}
                  aria-hidden="true"
                  className="size-3.5 rounded-full border border-border/60"
                  style={{ backgroundColor: color }}
                />
              ))}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plot-x-column">X axis column</Label>
        <Select
          value={String(document.xColumnIndex)}
          onValueChange={(value) =>
            commitDocument((doc) => ({
              ...doc,
              xColumnIndex: Number(value),
              xLabel: doc.columns[Number(value)] ?? doc.xLabel,
            }))
          }
        >
          <SelectTrigger id="plot-x-column">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {document.columns.map((column, index) => (
              <SelectItem key={index} value={String(index)}>
                {column}
                {numericColumns.includes(index) ? "" : " (labels)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label id="plot-series-label">Series</Label>
        <div aria-labelledby="plot-series-label" className="flex flex-col gap-1.5">
          {numericColumns.map((index) => {
            const checked = document.seriesColumnIndices.includes(index)
            const disabled = checked && document.seriesColumnIndices.length === 1
            return (
              <Label
                key={index}
                htmlFor={`plot-series-${index}`}
                className="flex cursor-pointer items-center gap-2 text-ui font-normal"
              >
                <Checkbox
                  id={`plot-series-${index}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(next) =>
                    commitDocument((doc) => ({
                      ...doc,
                      seriesColumnIndices: next
                        ? [...doc.seriesColumnIndices, index].sort((a, b) => a - b)
                        : doc.seriesColumnIndices.filter((item) => item !== index),
                    }))
                  }
                />
                {document.columns[index]}
              </Label>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="plot-x-label">X axis label</Label>
        <Input
          id="plot-x-label"
          value={document.xLabel}
          onChange={(event) =>
            commitDocument((doc) => ({ ...doc, xLabel: event.target.value }))
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plot-y-label">Y axis label</Label>
        <Input
          id="plot-y-label"
          value={document.yLabel}
          onChange={(event) =>
            commitDocument((doc) => ({ ...doc, yLabel: event.target.value }))
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        <Label
          htmlFor="plot-legend"
          className="flex cursor-pointer items-center gap-2 text-ui font-normal"
        >
          <Switch
            id="plot-legend"
            checked={document.showLegend}
            onCheckedChange={(checked) =>
              commitDocument((doc) => ({ ...doc, showLegend: checked }))
            }
          />
          Legend
        </Label>
        <Label
          htmlFor="plot-grid"
          className="flex cursor-pointer items-center gap-2 text-ui font-normal"
        >
          <Switch
            id="plot-grid"
            checked={document.showGrid}
            onCheckedChange={(checked) =>
              commitDocument((doc) => ({ ...doc, showGrid: checked }))
            }
          />
          Grid
        </Label>
        <Label
          htmlFor="plot-second-panel"
          className="flex cursor-pointer items-center gap-2 text-ui font-normal"
        >
          <Switch
            id="plot-second-panel"
            checked={Boolean(document.secondPanel)}
            onCheckedChange={(checked) =>
              commitDocument((doc) => (checked ? addSecondPanel(doc) : removeSecondPanel(doc)))
            }
          />
          Second panel
        </Label>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={() => setDataOpen(true)}>
        <DatabaseIcon aria-hidden="true" />
        Edit data
      </Button>

      {document.secondPanel ? (
        <div className="space-y-5 border-t border-border pt-5">
          <div className="space-y-2">
            <Label id="plot-layout-label">Layout</Label>
            <ToggleGroup
              type="single"
              value={document.layout ?? "side-by-side"}
              onValueChange={(value) => {
                if (!value) return
                commitDocument((doc) => setPlotLayout(doc, value as PlotLayout))
              }}
              spacing={1}
              size="sm"
              className="flex w-full flex-wrap justify-start"
              aria-labelledby="plot-layout-label"
            >
              <ToggleGroupItem value="side-by-side" className="px-2.5">
                Side by side
              </ToggleGroupItem>
              <ToggleGroupItem value="stacked" className="px-2.5">
                One above the other
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plot-panel-b-title">Panel B title</Label>
            <Input
              id="plot-panel-b-title"
              value={document.secondPanel.title}
              onChange={(event) =>
                commitDocument((doc) =>
                  doc.secondPanel
                    ? { ...doc, secondPanel: { ...doc.secondPanel, title: event.target.value || "Panel B" } }
                    : doc
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label id="plot-panel-b-type-label">Panel B chart</Label>
            <div
              role="radiogroup"
              aria-labelledby="plot-panel-b-type-label"
              className="flex flex-wrap gap-1 rounded-lg bg-muted p-1"
            >
              {chartTypes.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="xs"
                  role="radio"
                  aria-checked={document.secondPanel?.chartType === option.value}
                  className={cn(
                    "rounded-md text-muted-foreground hover:bg-transparent hover:text-foreground",
                    document.secondPanel?.chartType === option.value &&
                      "bg-card text-foreground shadow-regular-xs hover:bg-card"
                  )}
                  onClick={() =>
                    commitDocument((doc) =>
                      doc.secondPanel
                        ? {
                            ...doc,
                            secondPanel: {
                              ...doc.secondPanel,
                              ...suggestPlotEncoding(option.value, doc.columns, doc.secondPanel),
                              chartType: option.value,
                            },
                          }
                        : doc
                    )
                  }
                >
                  {option.label}
                </Button>
              ))}
            </div>
            {plotTypeRequirement(document.secondPanel.chartType) ? (
              <p className="text-caption text-muted-foreground">
                Panel B: {plotTypeRequirement(document.secondPanel.chartType)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="plot-panel-b-x">Panel B x column</Label>
            <Select
              value={String(document.secondPanel.xColumnIndex)}
              onValueChange={(value) =>
                commitDocument((doc) =>
                  doc.secondPanel
                    ? {
                        ...doc,
                        secondPanel: {
                          ...doc.secondPanel,
                          xColumnIndex: Number(value),
                          xLabel: doc.columns[Number(value)] ?? doc.secondPanel.xLabel,
                        },
                      }
                    : doc
                )
              }
            >
              <SelectTrigger id="plot-panel-b-x">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {document.columns.map((column, index) => (
                  <SelectItem key={index} value={String(index)}>
                    {column}
                    {numericColumns.includes(index) ? "" : " (labels)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label id="plot-panel-b-series-label">Panel B series</Label>
            <div aria-labelledby="plot-panel-b-series-label" className="flex flex-col gap-1.5">
              {numericColumns.map((index) => {
                const checked = document.secondPanel!.seriesColumnIndices.includes(index)
                const disabled = checked && document.secondPanel!.seriesColumnIndices.length === 1
                return (
                  <Label
                    key={index}
                    htmlFor={`plot-panel-b-series-${index}`}
                    className="flex cursor-pointer items-center gap-2 text-ui font-normal"
                  >
                    <Checkbox
                      id={`plot-panel-b-series-${index}`}
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(next) =>
                        commitDocument((doc) => {
                          if (!doc.secondPanel) return doc
                          const series = next
                            ? [...doc.secondPanel.seriesColumnIndices, index].sort((a, b) => a - b)
                            : doc.secondPanel.seriesColumnIndices.filter((item) => item !== index)
                          return {
                            ...doc,
                            secondPanel: {
                              ...doc.secondPanel,
                              seriesColumnIndices: series.length > 0 ? series : doc.secondPanel.seriesColumnIndices,
                            },
                          }
                        })
                      }
                    />
                    {document.columns[index]}
                  </Label>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plot-panel-b-x-label">Panel B x label</Label>
            <Input
              id="plot-panel-b-x-label"
              value={document.secondPanel.xLabel}
              onChange={(event) =>
                commitDocument((doc) =>
                  doc.secondPanel
                    ? { ...doc, secondPanel: { ...doc.secondPanel, xLabel: event.target.value } }
                    : doc
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plot-panel-b-y-label">Panel B y label</Label>
            <Input
              id="plot-panel-b-y-label"
              value={document.secondPanel.yLabel}
              onChange={(event) =>
                commitDocument((doc) =>
                  doc.secondPanel
                    ? { ...doc, secondPanel: { ...doc.secondPanel, yLabel: event.target.value } }
                    : doc
                )
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  )

  const inspectorRail = (fields: ReactNode) => (
    <Tabs defaultValue="inspector" className="flex min-h-0 flex-1 flex-col gap-0">
      <div className="px-3 pt-3">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="inspector">Inspector</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="inspector" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {fields}
      </TabsContent>
      <TabsContent value="versions" className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ProjectVersionsPanel />
      </TabsContent>
    </Tabs>
  )

  const jobBlock =
    job && (busy || job.status === "failed" || job.status === "canceled") ? (
      <div className="space-y-3">
        <GenerationStatus
          title={
            job.status === "canceled"
              ? "Revision canceled"
              : job.status === "failed"
                ? "Revision did not finish"
                : "Revising the chart"
          }
          description="Stages resume after reload"
          stages={job.stages}
          activeStage={job.activeStage}
          progress={job.progress}
          elapsed={formatJobElapsed(job)}
        />
        {busy ? (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => void cancelJob()}>
              Cancel
            </Button>
          </div>
        ) : null}
        {job.status === "failed" || job.status === "canceled" ? (
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={() => void retryJob()}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {dataDialog}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-end px-3 py-1 lg:hidden">
            <Sheet open={railOpen} onOpenChange={setRailOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings2Icon aria-hidden="true" />
                  Inspector
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-sidebar p-0 sm:max-w-none">
                <SheetHeader className="px-3 pt-4">
                  <SheetTitle>Chart settings</SheetTitle>
                  <SheetDescription>
                    Change the chart type, axes, palette, and stored versions.
                  </SheetDescription>
                </SheetHeader>
                <div className="h-[calc(100svh-6rem)]">{inspectorRail(renderInspectorFields())}</div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="max-h-28 shrink-0 overflow-y-auto px-4 pt-3">
            <ProjectThreadView thread={thread} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
              <div className="min-w-0 flex-1 space-y-1">
                <Label htmlFor="plot-editor-title" className="sr-only">
                  Chart title
                </Label>
                <Input
                  id="plot-editor-title"
                  key={`${changeSerial}-${document.metadata.title}`}
                  defaultValue={document.metadata.title}
                  onBlur={(event) => {
                    const next = event.target.value.trim()
                    if (!next || next === document.metadata.title) return
                    commitDocument((doc) => ({
                      ...doc,
                      metadata: { ...doc.metadata, title: next },
                    }))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur()
                  }}
                  className="h-auto max-w-xl border-0 bg-transparent px-0 text-lg font-medium shadow-none focus-visible:ring-0"
                />
                <p className="text-caption text-muted-foreground" data-plot-chart-type={document.chartType}>
                  {saveLabel}
                  {" · "}
                  {document.rows.length} rows · revision {revision}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <SaveToLibraryButton
                  prompt={title || document.metadata.title}
                  mimeType="image/svg+xml"
                  dataUrl={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
                  projectId={projectId}
                />
                <PlotShareDialog />
                {(["svg", "png", "jpg", "pdf", "pptx", "py"] as const).map((format) => (
                  <Button
                    key={format}
                    type="button"
                    variant={format === "svg" ? "default" : "outline"}
                    size="sm"
                    disabled={exporting !== null}
                    onClick={() => void exportChart(format)}
                  >
                    {exporting === format ? (
                      <Loader2Icon
                        className="animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                      />
                    ) : (
                      <DownloadIcon aria-hidden="true" />
                    )}
                    {format === "py" ? "Python" : format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </header>

            <div className="overflow-hidden rounded-2xl border border-border bg-muted">
              <div
                className="bg-card [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </div>

            {asset ? (
              <figure className="mt-4 space-y-2">
                <figcaption className="text-caption text-muted-foreground">
                  AI-rendered reference from your prompt
                </figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={asset.dataUrl}
                  alt={asset.prompt ?? title}
                  className="image-outline w-full rounded-2xl bg-muted"
                />
              </figure>
            ) : null}

            <div className="mt-4 space-y-3">
              {jobBlock}
              {displayError ? (
                <Alert variant="destructive">
                  <AlertTitle>Revision did not finish</AlertTitle>
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 px-4 pb-3 pt-2">
            <PromptComposer
              compact
              availableModes={["plot"]}
              initialMode="plot"
              showCredits={false}
              busy={busy}
              onCancel={busy && jobId ? () => void cancelJob() : undefined}
              submitLabel="Request change"
              submissionMessage="Revision requested"
              onSubmit={revise}
            />
          </div>
        </div>

        <aside className="hidden h-full w-80 shrink-0 border-s border-border bg-muted lg:block">
          {inspectorRail(renderInspectorFields())}
        </aside>
      </div>
    </div>
  )
}
