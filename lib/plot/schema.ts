import { z } from "zod"

const MAX_ROWS = 2_000
const MAX_COLUMNS = 24

export const plotChartTypeSchema = z.enum([
  "bar",
  "line",
  "scatter",
  "area",
  "pie",
  "stacked",
  "heatmap",
  "box",
  "volcano",
  "survival",
])
export type PlotChartType = z.infer<typeof plotChartTypeSchema>

export const plotPaletteIdSchema = z.enum([
  "publication",
  "graphite",
  "warm",
  "nature",
  "cell",
  "science",
  "lancet",
])
export type PlotPaletteId = z.infer<typeof plotPaletteIdSchema>

export const plotLayoutSchema = z.enum(["side-by-side", "stacked"])
export type PlotLayout = z.infer<typeof plotLayoutSchema>

const cellValue = z.string().max(200)

export const plotSecondPanelSchema = z
  .object({
    chartType: plotChartTypeSchema,
    xColumnIndex: z.number().int().min(0),
    seriesColumnIndices: z.array(z.number().int().min(0)).min(1).max(8),
    xLabel: z.string().max(200),
    yLabel: z.string().max(200),
    title: z.string().min(1).max(200),
  })
  .strict()
export type PlotSecondPanel = z.infer<typeof plotSecondPanelSchema>

export const plotDocumentSchema = z
  .object({
    kind: z.literal("plot"),
    schemaVersion: z.literal(1),
    page: z
      .object({
        width: z.number().finite().min(320).max(4_000),
        height: z.number().finite().min(240).max(4_000),
        background: z.string().max(180),
      })
      .strict(),
    chartType: plotChartTypeSchema,
    columns: z.array(z.string().min(1).max(120)).min(1).max(MAX_COLUMNS),
    rows: z.array(z.array(cellValue).min(1).max(MAX_COLUMNS)).min(1).max(MAX_ROWS),
    xColumnIndex: z.number().int().min(0),
    seriesColumnIndices: z.array(z.number().int().min(0)).min(1).max(8),
    xLabel: z.string().max(200),
    yLabel: z.string().max(200),
    paletteId: plotPaletteIdSchema,
    showLegend: z.boolean(),
    showGrid: z.boolean(),
    layout: plotLayoutSchema.optional(),
    secondPanel: plotSecondPanelSchema.optional(),
    metadata: z
      .object({
        title: z.string().min(1).max(300),
        description: z.string().max(2_000).optional(),
        sourceAssetIds: z.array(z.string().min(1).max(120)).max(100),
      })
      .strict(),
  })
  .strict()
  .superRefine((document, context) => {
    if (document.xColumnIndex >= document.columns.length) {
      context.addIssue({
        code: "custom",
        message: "The x column is out of range.",
        path: ["xColumnIndex"],
      })
    }
    document.seriesColumnIndices.forEach((index, position) => {
      if (index >= document.columns.length) {
        context.addIssue({
          code: "custom",
          message: `Series column ${index} is out of range.`,
          path: ["seriesColumnIndices", position],
        })
      }
    })
    if (document.secondPanel) {
      if (document.secondPanel.xColumnIndex >= document.columns.length) {
        context.addIssue({
          code: "custom",
          message: "The second-panel x column is out of range.",
          path: ["secondPanel", "xColumnIndex"],
        })
      }
      document.secondPanel.seriesColumnIndices.forEach((index, position) => {
        if (index >= document.columns.length) {
          context.addIssue({
            code: "custom",
            message: `Second-panel series column ${index} is out of range.`,
            path: ["secondPanel", "seriesColumnIndices", position],
          })
        }
      })
    }
    document.rows.forEach((row, rowIndex) => {
      if (row.length !== document.columns.length) {
        context.addIssue({
          code: "custom",
          message: `Row ${rowIndex + 1} has ${row.length} cells for ${document.columns.length} columns.`,
          path: ["rows", rowIndex],
        })
      }
    })
  })

export type PlotDocument = z.infer<typeof plotDocumentSchema>

export function parsePlotDocument(input: unknown): PlotDocument {
  return plotDocumentSchema.parse(input)
}
