import { parsePlotDocument, type PlotChartType, type PlotDocument, type PlotLayout } from "./schema"

const PAGE_MAX_WIDTH = 4_000
const PAGE_MAX_HEIGHT = 4_000
const PANEL_GAP = 16

export function complementaryChartType(chartType: PlotChartType): PlotChartType {
  if (chartType === "bar" || chartType === "stacked" || chartType === "pie") return "line"
  if (chartType === "heatmap" || chartType === "box") return "bar"
  return "bar"
}

export function plotLayoutOf(document: PlotDocument): PlotLayout {
  return document.layout ?? "side-by-side"
}

export function addSecondPanel(document: PlotDocument): PlotDocument {
  if (document.secondPanel) return document
  const layout: PlotLayout = "side-by-side"
  return parsePlotDocument({
    ...document,
    layout,
    page: {
      ...document.page,
      width: Math.min(PAGE_MAX_WIDTH, Math.round(document.page.width * 2)),
    },
    secondPanel: {
      chartType: complementaryChartType(document.chartType),
      xColumnIndex: document.xColumnIndex,
      seriesColumnIndices: document.seriesColumnIndices,
      xLabel: document.xLabel,
      yLabel: document.yLabel,
      title: "Panel B",
    },
  })
}

export function removeSecondPanel(document: PlotDocument): PlotDocument {
  if (!document.secondPanel) return document
  const layout = plotLayoutOf(document)
  return parsePlotDocument({
    ...singlePanelFields(document),
    page: {
      ...document.page,
      width:
        layout === "side-by-side"
          ? Math.max(320, Math.round(document.page.width / 2))
          : document.page.width,
      height:
        layout === "stacked"
          ? Math.max(240, Math.round(document.page.height / 2))
          : document.page.height,
    },
  })
}

export function setPlotLayout(document: PlotDocument, layout: PlotLayout): PlotDocument {
  if (!document.secondPanel || plotLayoutOf(document) === layout) {
    return parsePlotDocument({ ...document, layout: document.secondPanel ? layout : undefined })
  }
  const { width, height } = document.page
  if (layout === "stacked") {
    return parsePlotDocument({
      ...document,
      layout,
      page: {
        ...document.page,
        width: Math.max(320, Math.round(width / 2)),
        height: Math.min(PAGE_MAX_HEIGHT, Math.round(height * 2)),
      },
    })
  }
  return parsePlotDocument({
    ...document,
    layout,
    page: {
      ...document.page,
      width: Math.min(PAGE_MAX_WIDTH, Math.round(width * 2)),
      height: Math.max(240, Math.round(height / 2)),
    },
  })
}

export type PanelRect = { x: number; y: number; width: number; height: number }

export function plotPanelRects(document: PlotDocument): { a: PanelRect; b: PanelRect } | null {
  if (!document.secondPanel) return null
  const { width, height } = document.page
  if (plotLayoutOf(document) === "stacked") {
    const panelHeight = (height - PANEL_GAP) / 2
    return {
      a: { x: 0, y: 0, width, height: panelHeight },
      b: { x: 0, y: panelHeight + PANEL_GAP, width, height: panelHeight },
    }
  }
  const panelWidth = (width - PANEL_GAP) / 2
  return {
    a: { x: 0, y: 0, width: panelWidth, height },
    b: { x: panelWidth + PANEL_GAP, y: 0, width: panelWidth, height },
  }
}

export function panelDocument(
  document: PlotDocument,
  which: "a" | "b"
): PlotDocument {
  const rects = plotPanelRects(document)
  const page = rects
    ? {
        ...document.page,
        width: which === "a" ? rects.a.width : rects.b.width,
        height: which === "a" ? rects.a.height : rects.b.height,
      }
    : document.page

  if (which === "b" && document.secondPanel) {
    const panel = document.secondPanel
    return parsePlotDocument({
      ...singlePanelFields(document),
      page,
      chartType: panel.chartType,
      xColumnIndex: panel.xColumnIndex,
      seriesColumnIndices: panel.seriesColumnIndices,
      xLabel: panel.xLabel,
      yLabel: panel.yLabel,
      metadata: {
        ...document.metadata,
        title: panel.title,
      },
    })
  }

  return parsePlotDocument({
    ...singlePanelFields(document),
    page,
  })
}

function singlePanelFields(document: PlotDocument) {
  return {
    kind: document.kind,
    schemaVersion: document.schemaVersion,
    page: document.page,
    chartType: document.chartType,
    columns: document.columns,
    rows: document.rows,
    xColumnIndex: document.xColumnIndex,
    seriesColumnIndices: document.seriesColumnIndices,
    xLabel: document.xLabel,
    yLabel: document.yLabel,
    paletteId: document.paletteId,
    showLegend: document.showLegend,
    showGrid: document.showGrid,
    metadata: document.metadata,
  }
}
