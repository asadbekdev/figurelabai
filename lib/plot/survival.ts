import { numericCell } from "./parse"
import type { PlotDocument } from "./schema"

export type SurvivalEvent = {
  time: number
  event: boolean
  group: string
}

export type SurvivalCurve = {
  group: string
  points: Array<{ time: number; survival: number }>
}

export function parseSurvivalEvent(value: string): boolean | null {
  const normalized = value.trim().toLowerCase()
  if (["1", "true", "yes", "event", "death"].includes(normalized)) return true
  if (["0", "false", "no", "censored", "censor"].includes(normalized)) return false
  const numeric = numericCell(value)
  if (numeric === 1) return true
  if (numeric === 0) return false
  return null
}

export function survivalGroupColumnIndex(document: PlotDocument): number | null {
  const used = new Set([document.xColumnIndex, ...document.seriesColumnIndices])
  const remaining = document.columns
    .map((_, index) => index)
    .find((index) => !used.has(index))
  return remaining ?? null
}

export function survivalEvents(document: PlotDocument): SurvivalEvent[] {
  const eventColumn = document.seriesColumnIndices[0]
  if (eventColumn === undefined) return []
  const groupColumn = survivalGroupColumnIndex(document)

  return document.rows.flatMap((row) => {
    const time = numericCell(row[document.xColumnIndex] ?? "")
    const event = parseSurvivalEvent(row[eventColumn] ?? "")
    if (!Number.isFinite(time) || time < 0 || event === null) return []
    return [
      {
        time,
        event,
        group: (groupColumn !== null ? row[groupColumn] : "")?.trim() || "All",
      },
    ]
  })
}

export function estimateKaplanMeier(rows: SurvivalEvent[]): SurvivalCurve[] {
  const groups = new Map<string, SurvivalEvent[]>()
  for (const row of rows) {
    const bucket = groups.get(row.group) ?? []
    bucket.push(row)
    groups.set(row.group, bucket)
  }

  return [...groups.entries()].map(([group, members]) => {
    const sorted = [...members].sort((left, right) => left.time - right.time)
    let atRisk = sorted.length
    let survival = 1
    const points: Array<{ time: number; survival: number }> = [{ time: 0, survival: 1 }]

    let index = 0
    while (index < sorted.length) {
      const time = sorted[index]?.time ?? 0
      let deaths = 0
      let censored = 0
      while (index < sorted.length && sorted[index]?.time === time) {
        if (sorted[index]?.event) deaths += 1
        else censored += 1
        index += 1
      }
      if (deaths > 0 && atRisk > 0) {
        survival *= 1 - deaths / atRisk
        points.push({ time, survival: Math.max(0, survival) })
      }
      atRisk -= deaths + censored
    }

    return { group, points }
  })
}

export function survivalCurves(document: PlotDocument): SurvivalCurve[] {
  return estimateKaplanMeier(survivalEvents(document))
}

export const SURVIVAL_REQUIREMENT =
  "Survival needs a numeric time column (x), an event series coded 1/0 or yes/no (1 = event, 0 = censored), and an optional remaining column as the group. This is a Kaplan–Meier step curve from those rows. It does not fit a Cox model, compute a log-rank p-value, or draw confidence bands."
