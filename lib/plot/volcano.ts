import { numericCell } from "./parse"
import type { PlotDocument } from "./schema"

export const VOLCANO_FC_THRESHOLD = 1
export const VOLCANO_P_THRESHOLD = 0.05

export type VolcanoPoint = {
  id: string
  label: string
  log2fc: number
  pValue: number
  negLog10p: number
  significant: boolean
}

export function looksLikePValue(values: number[]): boolean {
  const finite = values.filter((value) => Number.isFinite(value) && value > 0)
  if (finite.length === 0) return false
  return finite.every((value) => value <= 1)
}

export function volcanoPoints(document: PlotDocument): VolcanoPoint[] {
  const pColumn = document.seriesColumnIndices[0]
  if (pColumn === undefined) return []

  const raw = document.rows.map((row) => numericCell(row[pColumn] ?? ""))
  const asP = looksLikePValue(raw)

  return document.rows.map((row, index) => {
    const log2fc = numericCell(row[document.xColumnIndex] ?? "")
    const rawP = raw[index] ?? 0
    const pValue = asP ? rawP : 10 ** -Math.max(0, rawP)
    const negLog10p = asP
      ? rawP > 0
        ? -Math.log10(Math.max(rawP, Number.EPSILON))
        : 0
      : Math.max(0, rawP)
    const label =
      document.columns
        .map((_, columnIndex) => columnIndex)
        .find(
          (columnIndex) =>
            columnIndex !== document.xColumnIndex &&
            !document.seriesColumnIndices.includes(columnIndex)
        )
    return {
      id: `volcano-${index}`,
      label: (label !== undefined ? row[label] : row[document.xColumnIndex]) || `Row ${index + 1}`,
      log2fc,
      pValue,
      negLog10p,
      significant:
        Math.abs(log2fc) >= VOLCANO_FC_THRESHOLD && pValue > 0 && pValue < VOLCANO_P_THRESHOLD,
    }
  })
}

export const VOLCANO_REQUIREMENT =
  "Volcano needs a numeric x column of log2 fold change and one numeric series of p-values (0–1) or already-transformed −log10(p). Thresholds are visual only: |log2FC| ≥ 1 and p < 0.05. This chart does not run a differential-expression test or multiple-testing correction."
