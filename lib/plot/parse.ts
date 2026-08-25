import { parsePlotDocument, type PlotChartType, type PlotDocument } from "./schema"

export type ParsedTable = {
  columns: string[]
  rows: string[][]
}

function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let current = ""
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === delimiter) {
      cells.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

export function parseTable(text: string): ParsedTable | null {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  if (lines.length < 2) return null

  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ","
  const columns = splitRow(lines[0], delimiter).map((column, index) =>
    column || `Column ${index + 1}`
  )
  if (columns.length < 2) return null

  const rows: string[][] = []
  for (const line of lines.slice(1)) {
    const cells = splitRow(line, delimiter)
    while (cells.length < columns.length) cells.push("")
    rows.push(cells.slice(0, columns.length))
  }
  if (rows.length === 0) return null

  return { columns, rows }
}

export function isNumericColumn(table: ParsedTable, columnIndex: number): boolean {
  let seen = 0
  let numeric = 0
  for (const row of table.rows) {
    const cell = row[columnIndex]?.trim() ?? ""
    if (!cell) continue
    seen += 1
    if (Number.isFinite(Number(cell.replace(/,/g, "")))) numeric += 1
  }
  return seen > 0 && numeric / seen >= 0.8
}

export function numericCell(value: string): number {
  const parsed = Number(value.replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

export function tableToCsv(columns: string[], rows: string[][]): string {
  const escapeCell = (cell: string) =>
    cell.includes(",") || cell.includes('"') || cell.includes("\n")
      ? `"${cell.replaceAll('"', '""')}"`
      : cell
  return [columns.map(escapeCell).join(","), ...rows.map((row) => row.map(escapeCell).join(","))].join(
    "\n"
  )
}

export function suggestPlotEncoding(
  chartType: PlotChartType,
  columns: string[],
  current: { xColumnIndex: number; seriesColumnIndices: number[] }
): { xColumnIndex: number; seriesColumnIndices: number[] } {
  if (chartType === "volcano") {
    const x = columns.findIndex((column) => /log2|fold|\bfc\b/i.test(column))
    const p = columns.findIndex((column) => /p.?val|padj|fdr|neglog/i.test(column))
    return {
      xColumnIndex: x >= 0 ? x : current.xColumnIndex,
      seriesColumnIndices: p >= 0 ? [p] : current.seriesColumnIndices.slice(0, 1),
    }
  }
  if (chartType === "survival") {
    const time = columns.findIndex((column) => /time|month|day|week|year/i.test(column))
    const event = columns.findIndex((column) => /event|status|censor|death/i.test(column))
    return {
      xColumnIndex: time >= 0 ? time : 0,
      seriesColumnIndices: event >= 0 ? [event] : [current.seriesColumnIndices[0] ?? 1],
    }
  }
  return current
}

export function plotDocumentFromTable(input: {
  table: ParsedTable
  title: string
  description?: string
}): PlotDocument | null {
  const { table } = input
  const numericColumns = table.columns
    .map((_, index) => index)
    .filter((index) => isNumericColumn(table, index))
  if (numericColumns.length === 0) return null

  const xColumnIndex = table.columns.findIndex((_, index) => !numericColumns.includes(index))
  const resolvedX = xColumnIndex >= 0 ? xColumnIndex : 0
  const seriesColumnIndices = numericColumns.filter((index) => index !== resolvedX).slice(0, 8)
  if (seriesColumnIndices.length === 0) return null

  const xIsNumeric = isNumericColumn(table, resolvedX)

  return parsePlotDocument({
    kind: "plot",
    schemaVersion: 1,
    page: { width: 960, height: 540, background: "#ffffff" },
    chartType: xIsNumeric ? "line" : "bar",
    columns: table.columns,
    rows: table.rows,
    xColumnIndex: resolvedX,
    seriesColumnIndices,
    xLabel: table.columns[resolvedX],
    yLabel: table.columns[seriesColumnIndices[0]],
    paletteId: "publication",
    showLegend: seriesColumnIndices.length > 1,
    showGrid: true,
    metadata: {
      title: input.title.slice(0, 300) || "Plot",
      description: input.description?.slice(0, 2_000),
      sourceAssetIds: [],
    },
  })
}
