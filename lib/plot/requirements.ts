import type { PlotChartType } from "./schema"
import { SURVIVAL_REQUIREMENT } from "./survival"
import { VOLCANO_REQUIREMENT } from "./volcano"

export function plotTypeRequirement(chartType: PlotChartType): string | null {
  if (chartType === "volcano") return VOLCANO_REQUIREMENT
  if (chartType === "survival") return SURVIVAL_REQUIREMENT
  if (chartType === "heatmap") {
    return "Heatmap uses the x column as row labels and every selected numeric series as a column. Each cell is the raw value — this is not a clustered or z-scored matrix unless your table already is."
  }
  if (chartType === "box") {
    return "Box plots group rows by the x column and collect every selected numeric series as replicate values. Quartiles are computed in the browser; this is not a statistical test."
  }
  return null
}
