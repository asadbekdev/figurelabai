import type { PlotPaletteId } from "./schema"

// Portable artifact colors for plot documents (same rule as
// lib/flowchart/palette.ts): charts must render identically outside the app.
export type PlotPalette = {
  id: PlotPaletteId
  label: string
  series: string[]
  axis: string
  grid: string
  text: string
}

export const plotPalettes: PlotPalette[] = [
  {
    id: "publication",
    label: "Publication",
    series: ["#1e40af", "#b45309", "#3f6212", "#7f1d1d", "#52525b", "#0e7490"],
    axis: "#3f3f46",
    grid: "#e4e4e7",
    text: "#18181b",
  },
  {
    id: "graphite",
    label: "Graphite",
    series: ["#18181b", "#52525b", "#a1a1aa", "#3f3f46", "#71717a", "#d4d4d8"],
    axis: "#3f3f46",
    grid: "#e4e4e7",
    text: "#18181b",
  },
  {
    id: "warm",
    label: "Warm",
    series: ["#7f1d1d", "#b45309", "#a16207", "#4d7c0f", "#0f766e", "#52525b"],
    axis: "#3f3f46",
    grid: "#e7e5e4",
    text: "#1c1917",
  },
  {
    id: "nature",
    label: "Nature",
    series: ["#0f766e", "#365314", "#a16207", "#1e293b", "#0e7490", "#52525b"],
    axis: "#1e293b",
    grid: "#e2e8f0",
    text: "#0f172a",
  },
  {
    id: "cell",
    label: "Cell",
    series: ["#1e3a8a", "#0e7490", "#155e75", "#334155", "#0369a1", "#52525b"],
    axis: "#1e293b",
    grid: "#e2e8f0",
    text: "#0f172a",
  },
  {
    id: "science",
    label: "Science",
    series: ["#9f1239", "#b45309", "#1e3a8a", "#44403c", "#a16207", "#52525b"],
    axis: "#44403c",
    grid: "#f5f5f4",
    text: "#1c1917",
  },
  {
    id: "lancet",
    label: "Lancet",
    series: ["#115e59", "#b45309", "#1e293b", "#78716c", "#0f766e", "#52525b"],
    axis: "#1e293b",
    grid: "#f5f5f4",
    text: "#1c1917",
  },
]

export function plotPalette(id: PlotPaletteId): PlotPalette {
  return plotPalettes.find((palette) => palette.id === id) ?? plotPalettes[0]
}
