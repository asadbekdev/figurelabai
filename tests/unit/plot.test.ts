import { XMLParser } from "fast-xml-parser"
import { describe, expect, it } from "vitest"

import { addSecondPanel, setPlotLayout } from "@/lib/plot/panels"
import { parseTable, plotDocumentFromTable, suggestPlotEncoding, tableToCsv } from "@/lib/plot/parse"
import { estimateKaplanMeier } from "@/lib/plot/survival"
import { plotTemplates } from "@/lib/plot/templates"
import { volcanoPoints } from "@/lib/plot/volcano"
import { createPlotPython } from "@/lib/plot/python"
import { plotPalettes } from "@/lib/plot/palette"
import { renderPlotSvg } from "@/lib/plot/render"
import { parsePlotDocument } from "@/lib/plot/schema"
import { usePlotEditorStore } from "@/lib/plot/store"
import { createWorkspaceRepository } from "@/lib/product/workspace-repository"
import { createMemoryStorage } from "@/lib/product/workspace-storage"

const CSV = `step,yield,control
A,12,8
B,19,9
C,7,11
D,15,10`

describe("parseTable", () => {
  it("parses comma-separated text with a header row", () => {
    const table = parseTable(CSV)
    expect(table?.columns).toEqual(["step", "yield", "control"])
    expect(table?.rows).toHaveLength(4)
    expect(table?.rows[0]).toEqual(["A", "12", "8"])
  })

  it("parses tab-separated text", () => {
    const table = parseTable("step\tyield\nA\t12\nB\t19")
    expect(table?.columns).toEqual(["step", "yield"])
    expect(table?.rows).toHaveLength(2)
  })

  it("returns null for a single line", () => {
    expect(parseTable("just one line")).toBeNull()
  })

  it("round-trips through tableToCsv", () => {
    const table = parseTable(CSV)
    expect(table).not.toBeNull()
    const reparsed = parseTable(tableToCsv(table!.columns, table!.rows))
    expect(reparsed).toEqual(table)
  })
})

describe("plotDocumentFromTable", () => {
  it("builds a valid plot document with numeric series", () => {
    const table = parseTable(CSV)!
    const document = plotDocumentFromTable({ table, title: "Yield by step" })
    expect(document).not.toBeNull()
    expect(document!.xColumnIndex).toBe(0)
    expect(document!.seriesColumnIndices).toEqual([1, 2])
    expect(document!.chartType).toBe("bar")
    expect(() => parsePlotDocument(document)).not.toThrow()
  })

  it("returns null when no numeric column exists", () => {
    const table = parseTable("name,label\nA,alpha\nB,beta")!
    expect(plotDocumentFromTable({ table, title: "No numbers" })).toBeNull()
  })
})

describe("journal palettes", () => {
  it("includes Nature, Cell, Science, and Lancet as portable plot palettes", () => {
    expect(plotPalettes.map((item) => item.id)).toEqual([
      "publication",
      "graphite",
      "warm",
      "nature",
      "cell",
      "science",
      "lancet",
    ])
    const nature = plotDocumentFromTable({ table: parseTable(CSV)!, title: "Yield" })!
    const svg = renderPlotSvg({ ...nature, paletteId: "nature" })
    expect(svg).toContain("#0f766e")
  })
})

describe("renderPlotSvg", () => {
  it("renders a valid SVG with bars, axes, title, and legend", () => {
    const table = parseTable(CSV)!
    const document = plotDocumentFromTable({ table, title: "Yield by step" })!
    const svg = renderPlotSvg(document)

    const parsed = new XMLParser({ ignoreAttributes: false }).parse(svg)
    expect(parsed.svg).toBeTruthy()
    expect(parsed.svg.rect).toBeTruthy()

    expect(svg).toContain("Yield by step")
    expect(svg).toContain('data-series="yield"')
    expect(svg).toContain('data-series="control"')
    expect(svg).toContain('viewBox="0 0 960 540"')
  })

  it("escapes markup in labels", () => {
    const table = parseTable(CSV)!
    const document = {
      ...plotDocumentFromTable({ table, title: "Yield" })!,
      xLabel: "Step <script>",
    }
    const svg = renderPlotSvg(document)
    expect(svg).not.toContain("<script>")
    expect(svg).toContain("&lt;script&gt;")
  })

  it("renders line and scatter types for numeric x", () => {
    const table = parseTable("time,signal\n1,3\n2,5\n3,4\n4,9")!
    const document = plotDocumentFromTable({ table, title: "Signal over time" })!
    expect(document.chartType).toBe("line")
    const lineSvg = renderPlotSvg(document)
    expect(lineSvg).toContain("<path")
    const scatterSvg = renderPlotSvg({ ...document, chartType: "scatter" })
    expect(scatterSvg).toContain("<circle")
  })

  it("renders a line through categorical x instead of bars", () => {
    const table = parseTable(CSV)!
    const document = {
      ...plotDocumentFromTable({ table, title: "Yield by step" })!,
      chartType: "line" as const,
    }
    const svg = renderPlotSvg(document)
    expect(svg).toContain("<path")
    expect(svg).toContain('data-series="yield"')
    expect(svg).not.toMatch(/<rect data-series/)
  })

  it("renders pie and stacked chart types", () => {
    const table = parseTable(CSV)!
    const document = plotDocumentFromTable({ table, title: "Yield by step" })!
    const pie = renderPlotSvg({ ...document, chartType: "pie" })
    expect(pie).toContain("A ")
    expect(pie).toContain("<path")
    const stacked = renderPlotSvg({ ...document, chartType: "stacked" })
    expect(stacked).toContain('data-series="yield"')
    expect(stacked).toContain('data-series="control"')
  })

  it("renders heatmap cells and box-plot groups", () => {
    const table = parseTable(CSV)!
    const document = plotDocumentFromTable({ table, title: "Yield by step" })!
    const heatmap = renderPlotSvg({ ...document, chartType: "heatmap" })
    expect(heatmap).toContain('data-series="yield"')
    expect(heatmap).toContain('data-row="A"')
    const box = renderPlotSvg({ ...document, chartType: "box" })
    expect(box).toContain('data-series="A"')
    expect(box).toContain('data-series="B"')
  })

  it("emits runnable matplotlib for the current chart type", () => {
    const table = parseTable(CSV)!
    const document = plotDocumentFromTable({ table, title: "Yield by step" })!
    const script = createPlotPython(document)
    expect(script).toContain("import matplotlib.pyplot as plt")
    expect(script).toContain("ax.bar")
    expect(script).toContain("fig.savefig(\"figure.svg\")")
    const heat = createPlotPython({ ...document, chartType: "heatmap" })
    expect(heat).toContain("imshow")
    const box = createPlotPython({ ...document, chartType: "box" })
    expect(box).toContain("boxplot")
  })

  it("renders a volcano from log2FC and p-values", () => {
    const volcano = plotTemplates.find((template) => template.id === "differential-volcano")!.build()
    expect(volcano.chartType).toBe("volcano")
    expect(volcano.xColumnIndex).toBe(1)
    const points = volcanoPoints(volcano)
    expect(points.some((point) => point.significant)).toBe(true)
    expect(points.some((point) => !point.significant)).toBe(true)
    const svg = renderPlotSvg(volcano)
    expect(svg).toContain('data-series="significant"')
    expect(svg).toContain('data-series="ns"')
    const script = createPlotPython(volcano)
    expect(script).toContain("scatter")
    expect(script).toContain("Not a DE test")
  })

  it("renders Kaplan-Meier steps from time, event, and group", () => {
    const survival = plotTemplates.find((template) => template.id === "km-survival")!.build()
    expect(survival.chartType).toBe("survival")
    const svg = renderPlotSvg(survival)
    expect(svg).toContain('data-series="Control"')
    expect(svg).toContain('data-series="Treated"')
    const script = createPlotPython(survival)
    expect(script).toContain("ax.step")
    expect(script).toContain("Not a Cox model")
  })

  it("computes a known Kaplan-Meier step", () => {
    const curves = estimateKaplanMeier([
      { time: 1, event: true, group: "A" },
      { time: 2, event: false, group: "A" },
      { time: 3, event: true, group: "A" },
    ])
    expect(curves).toHaveLength(1)
    expect(curves[0]?.points.at(-1)?.survival).toBeCloseTo(0, 5)
    expect(curves[0]?.points.find((point) => point.time === 1)?.survival).toBeCloseTo(2 / 3, 5)
  })

  it("composes two charts on one figure and exports both panels", () => {
    const table = parseTable(CSV)!
    const single = plotDocumentFromTable({ table, title: "Yield by step" })!
    const two = addSecondPanel(single)
    expect(two.secondPanel?.chartType).toBe("line")
    expect(two.page.width).toBe(single.page.width * 2)
    const svg = renderPlotSvg(two)
    expect(svg).toContain('data-panel="A"')
    expect(svg).toContain('data-panel="B"')
    expect(svg).toContain('data-series="yield"')
    expect(svg).toContain("<path")
    const stacked = setPlotLayout(two, "stacked")
    const stackedSvg = renderPlotSvg(stacked)
    expect(stackedSvg).toContain('data-panel="A"')
    expect(stackedSvg).toContain('data-panel="B"')
    expect(stacked.page.height).toBeGreaterThan(two.page.height)
    const script = createPlotPython(two)
    expect(script).toContain("plt.subplots(1, 2")
    expect(script).toContain("ax_a")
    expect(script).toContain("ax_b")
    const template = plotTemplates.find((item) => item.id === "two-panel-response")!.build()
    expect(template.secondPanel?.chartType).toBe("line")
    expect(renderPlotSvg(template)).toContain('data-panel="B"')
  })

  it("maps volcano and survival columns by name", () => {
    const volcano = suggestPlotEncoding("volcano", ["gene", "log2fc", "pvalue"], {
      xColumnIndex: 0,
      seriesColumnIndices: [1],
    })
    expect(volcano).toEqual({ xColumnIndex: 1, seriesColumnIndices: [2] })
    const survival = suggestPlotEncoding("survival", ["time", "event", "group"], {
      xColumnIndex: 2,
      seriesColumnIndices: [0],
    })
    expect(survival).toEqual({ xColumnIndex: 0, seriesColumnIndices: [1] })
  })
})

describe("xlsx ingest", () => {
  it("round-trips a table through a minimal workbook", async () => {
    const { createMinimalXlsx, parseXlsx } = await import("@/lib/plot/xlsx")
    const table = parseTable(CSV)!
    const parsed = await parseXlsx(createMinimalXlsx(table))
    expect(parsed?.columns).toEqual(table.columns)
    expect(parsed?.rows[0]).toEqual(table.rows[0])
  })
})

describe("plot document persistence", () => {
  it("saves and reopens a plot document through the repository", async () => {
    const table = parseTable(CSV)!
    const document = plotDocumentFromTable({ table, title: "Yield by step" })!
    const repository = createWorkspaceRepository(createMemoryStorage())

    const created = await repository.createProject({
      title: "Yield by step",
      mode: "plot",
      document,
      source: "generation",
    })
    expect(created.document?.content.kind).toBe("plot")

    const opened = await repository.openProject(created.project.id)
    expect(opened?.document?.content.kind).toBe("plot")
    if (opened?.document?.content.kind === "plot") {
      expect(opened.document.content.rows).toHaveLength(4)
    }

    const edited = { ...document, chartType: "scatter" as const }
    const saved = await repository.saveDocument(created.project.id, edited, 1, "autosave")
    expect(saved.ok).toBe(true)

    const reopened = await repository.openProject(created.project.id)
    if (reopened?.document?.content.kind === "plot") {
      expect(reopened.document.content.chartType).toBe("scatter")
      expect(reopened.document.revision).toBe(2)
    } else {
      throw new Error("Expected a plot document")
    }
  })
})

describe("plot editor store", () => {
  it("switches a categorical bar chart to a line chart", () => {
    const document = plotDocumentFromTable({
      table: parseTable(CSV)!,
      title: "Yield by step",
    })!
    expect(document.chartType).toBe("bar")
    usePlotEditorStore.getState().reset()
    usePlotEditorStore.getState().loadDocument(document)
    usePlotEditorStore.getState().updateDocument((current) => ({
      ...current,
      ...suggestPlotEncoding("line", current.columns, current),
      chartType: "line",
    }))
    expect(usePlotEditorStore.getState().document?.chartType).toBe("line")
    expect(usePlotEditorStore.getState().changeSerial).toBe(1)
    usePlotEditorStore.getState().reset()
  })
})
