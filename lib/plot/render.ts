import { panelDocument, plotPanelRects } from "./panels"
import { numericCell } from "./parse"
import { plotPalette } from "./palette"
import type { PlotDocument } from "./schema"
import { survivalCurves } from "./survival"
import { VOLCANO_FC_THRESHOLD, volcanoPoints } from "./volcano"

function hexChannel(hex: string, index: number): number {
  const normalized = hex.replace("#", "")
  const wide = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized
  return Number.parseInt(wide.slice(index * 2, index * 2 + 2) || "00", 16)
}

function mixHex(from: string, to: string, amount: number): string {
  const t = Math.min(1, Math.max(0, amount))
  const channels = [0, 1, 2].map((index) => {
    const start = hexChannel(from, index)
    const end = hexChannel(to, index)
    return Math.round(start + (end - start) * t)
      .toString(16)
      .padStart(2, "0")
  })
  return `#${channels.join("")}`
}

function quartiles(values: number[]): {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers: number[]
} | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const at = (position: number) => {
    const index = (sorted.length - 1) * position
    const lo = Math.floor(index)
    const hi = Math.ceil(index)
    const lower = sorted[lo] ?? 0
    const upper = sorted[hi] ?? lower
    return lower + (upper - lower) * (index - lo)
  }
  const q1 = at(0.25)
  const median = at(0.5)
  const q3 = at(0.75)
  const iqr = q3 - q1
  const fenceLo = q1 - 1.5 * iqr
  const fenceHi = q3 + 1.5 * iqr
  const inliers = sorted.filter((value) => value >= fenceLo && value <= fenceHi)
  return {
    min: inliers[0] ?? sorted[0],
    q1,
    median,
    q3,
    max: inliers.at(-1) ?? sorted.at(-1) ?? sorted[0],
    outliers: sorted.filter((value) => value < fenceLo || value > fenceHi),
  }
}

function boxGroups(document: PlotDocument): Array<{ label: string; values: number[] }> {
  const seriesColumns = document.seriesColumnIndices
  const groups = new Map<string, number[]>()
  document.rows.forEach((row) => {
    const label = (row[document.xColumnIndex] ?? "").trim() || "Group"
    const bucket = groups.get(label) ?? []
    for (const columnIndex of seriesColumns) {
      bucket.push(numericCell(row[columnIndex] ?? ""))
    }
    groups.set(label, bucket)
  })
  return [...groups.entries()].map(([label, values]) => ({ label, values }))
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function num(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function formatTick(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return Math.abs(rounded) >= 10_000
    ? rounded.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : String(rounded)
}

function truncateLabel(value: string, max = 14): string {
  const trimmed = value.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed
}

function niceTicks(min: number, max: number, count = 5): number[] {
  const lo = Math.min(min, 0)
  const hi = max <= lo ? lo + 1 : max
  const span = hi - lo
  const step0 = span / count
  const magnitude = 10 ** Math.floor(Math.log10(step0))
  const normalized = step0 / magnitude
  const step = (normalized >= 5 ? 10 : normalized >= 2 ? 5 : normalized >= 1 ? 2 : 1) * magnitude
  const start = Math.ceil(lo / step - 1e-9) * step
  const ticks: number[] = []
  for (let value = start; value <= hi + 1e-9; value += step) {
    ticks.push(Math.round(value * 1e9) / 1e9)
  }
  return ticks
}

type Scale = {
  plotLeft: number
  plotTop: number
  plotWidth: number
  plotHeight: number
  yMin: number
  yMax: number
}

const FONT =
  "-apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Helvetica, Arial, sans-serif"

function renderVolcanoSvg(document: PlotDocument): string {
  const palette = plotPalette(document.paletteId)
  const { width, height, background } = document.page
  const points = volcanoPoints(document)
  const xMin = Math.min(-VOLCANO_FC_THRESHOLD, ...points.map((point) => point.log2fc), 0)
  const xMax = Math.max(VOLCANO_FC_THRESHOLD, ...points.map((point) => point.log2fc), 0)
  const yMax = Math.max(1.4, ...points.map((point) => point.negLog10p))
  const scale: Scale = {
    plotLeft: 76,
    plotTop: 64,
    plotWidth: width - 108,
    plotHeight: height - 64 - 76,
    yMin: 0,
    yMax,
  }
  const xFor = (value: number) =>
    scale.plotLeft +
    (xMax === xMin ? scale.plotWidth / 2 : ((value - xMin) / (xMax - xMin)) * scale.plotWidth)
  const yFor = (value: number) =>
    scale.plotTop + scale.plotHeight - (value / scale.yMax) * scale.plotHeight

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(
      height
    )}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-labelledby="plot-title">`,
    `<title id="plot-title">${escapeXml(document.metadata.title)}</title>`,
    `<rect width="100%" height="100%" fill="${escapeXml(background)}" />`,
  ]

  if (document.showGrid) {
    for (const tick of niceTicks(0, yMax)) {
      parts.push(
        `<line x1="${num(scale.plotLeft)}" y1="${num(yFor(tick))}" x2="${num(
          scale.plotLeft + scale.plotWidth
        )}" y2="${num(yFor(tick))}" stroke="${palette.grid}" stroke-width="1" />`
      )
    }
  }

  parts.push(
    `<line x1="${num(scale.plotLeft)}" y1="${num(scale.plotTop)}" x2="${num(
      scale.plotLeft
    )}" y2="${num(scale.plotTop + scale.plotHeight)}" stroke="${palette.axis}" stroke-width="1.5" />`
  )
  parts.push(
    `<line x1="${num(scale.plotLeft)}" y1="${num(yFor(0))}" x2="${num(
      scale.plotLeft + scale.plotWidth
    )}" y2="${num(yFor(0))}" stroke="${palette.axis}" stroke-width="1.5" />`
  )
  parts.push(
    `<line x1="${num(xFor(0))}" y1="${num(scale.plotTop)}" x2="${num(xFor(0))}" y2="${num(
      scale.plotTop + scale.plotHeight
    )}" stroke="${palette.axis}" stroke-width="1" stroke-dasharray="4 4" />`
  )
  parts.push(
    `<line x1="${num(scale.plotLeft)}" y1="${num(yFor(1.301))}" x2="${num(
      scale.plotLeft + scale.plotWidth
    )}" y2="${num(yFor(1.301))}" stroke="${palette.grid}" stroke-width="1" stroke-dasharray="4 4" />`
  )

  for (const tick of niceTicks(0, yMax)) {
    parts.push(
      `<text x="${num(scale.plotLeft - 10)}" y="${num(yFor(tick) + 4)}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(formatTick(tick))}</text>`
    )
  }
  for (const tick of niceTicks(xMin, xMax, 6)) {
    parts.push(
      `<text x="${num(xFor(tick))}" y="${num(
        scale.plotTop + scale.plotHeight + 20
      )}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(formatTick(tick))}</text>`
    )
  }

  const sig = palette.series[0] ?? "#18181b"
  const rest = palette.series[1] ?? "#a1a1aa"
  for (const point of points) {
    parts.push(
      `<circle data-series="${point.significant ? "significant" : "ns"}" data-label="${escapeXml(
        point.label
      )}" cx="${num(xFor(point.log2fc))}" cy="${num(yFor(point.negLog10p))}" r="3.5" fill="${
        point.significant ? sig : rest
      }" fill-opacity="${point.significant ? 0.92 : 0.55}" />`
    )
  }

  parts.push(
    `<text x="${num(scale.plotLeft)}" y="34" font-family="${FONT}" font-size="18" font-weight="600" fill="${palette.text}">${escapeXml(document.metadata.title)}</text>`
  )
  parts.push(
    `<text x="${num(scale.plotLeft + scale.plotWidth / 2)}" y="${num(
      height - 16
    )}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="500" fill="${palette.text}">${escapeXml(document.xLabel || "log2 fold change")}</text>`
  )
  parts.push(
    `<text x="20" y="${num(
      scale.plotTop + scale.plotHeight / 2
    )}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="500" fill="${
      palette.text
    }" transform="rotate(-90 20 ${num(scale.plotTop + scale.plotHeight / 2)})">${escapeXml(document.yLabel || "−log10(p)")}</text>`
  )
  if (document.showLegend) {
    const legendX = width - 164
    parts.push(`<rect x="${num(legendX)}" y="59" width="10" height="10" rx="2" fill="${sig}" />`)
    parts.push(
      `<text x="${num(legendX + 16)}" y="68" font-family="${FONT}" font-size="12" fill="${palette.text}">|log2FC| ≥ 1 and p &lt; 0.05</text>`
    )
    parts.push(`<rect x="${num(legendX)}" y="81" width="10" height="10" rx="2" fill="${rest}" />`)
    parts.push(
      `<text x="${num(legendX + 16)}" y="90" font-family="${FONT}" font-size="12" fill="${palette.text}">Below threshold</text>`
    )
  }
  parts.push("</svg>")
  return parts.join("")
}

function renderSurvivalSvg(document: PlotDocument): string {
  const palette = plotPalette(document.paletteId)
  const { width, height, background } = document.page
  const curves = survivalCurves(document)
  const xMax = Math.max(1, ...curves.flatMap((curve) => curve.points.map((point) => point.time)))
  const legend = document.showLegend && curves.length > 1
  const scale: Scale = {
    plotLeft: 76,
    plotTop: 64,
    plotWidth: width - 76 - (legend ? 176 : 32),
    plotHeight: height - 64 - 76,
    yMin: 0,
    yMax: 1,
  }
  const xFor = (value: number) => scale.plotLeft + (value / xMax) * scale.plotWidth
  const yFor = (value: number) =>
    scale.plotTop + scale.plotHeight - value * scale.plotHeight

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(
      height
    )}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-labelledby="plot-title">`,
    `<title id="plot-title">${escapeXml(document.metadata.title)}</title>`,
    `<rect width="100%" height="100%" fill="${escapeXml(background)}" />`,
  ]

  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  if (document.showGrid) {
    for (const tick of yTicks) {
      parts.push(
        `<line x1="${num(scale.plotLeft)}" y1="${num(yFor(tick))}" x2="${num(
          scale.plotLeft + scale.plotWidth
        )}" y2="${num(yFor(tick))}" stroke="${palette.grid}" stroke-width="1" />`
      )
    }
  }
  parts.push(
    `<line x1="${num(scale.plotLeft)}" y1="${num(scale.plotTop)}" x2="${num(
      scale.plotLeft
    )}" y2="${num(scale.plotTop + scale.plotHeight)}" stroke="${palette.axis}" stroke-width="1.5" />`
  )
  parts.push(
    `<line x1="${num(scale.plotLeft)}" y1="${num(yFor(0))}" x2="${num(
      scale.plotLeft + scale.plotWidth
    )}" y2="${num(yFor(0))}" stroke="${palette.axis}" stroke-width="1.5" />`
  )
  for (const tick of yTicks) {
    parts.push(
      `<text x="${num(scale.plotLeft - 10)}" y="${num(yFor(tick) + 4)}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(formatTick(tick))}</text>`
    )
  }
  for (const tick of niceTicks(0, xMax, 6)) {
    parts.push(
      `<text x="${num(xFor(tick))}" y="${num(
        scale.plotTop + scale.plotHeight + 20
      )}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(formatTick(tick))}</text>`
    )
  }

  curves.forEach((curve, index) => {
    const color = palette.series[index % palette.series.length]
    const path = curve.points
      .flatMap((point, pointIndex) => {
        const previous = curve.points[pointIndex - 1]
        if (!previous) return [`M ${num(xFor(point.time))} ${num(yFor(point.survival))}`]
        return [
          `L ${num(xFor(point.time))} ${num(yFor(previous.survival))}`,
          `L ${num(xFor(point.time))} ${num(yFor(point.survival))}`,
        ]
      })
      .join(" ")
    parts.push(
      `<path data-series="${escapeXml(curve.group)}" d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="miter" />`
    )
  })

  parts.push(
    `<text x="${num(scale.plotLeft)}" y="34" font-family="${FONT}" font-size="18" font-weight="600" fill="${palette.text}">${escapeXml(document.metadata.title)}</text>`
  )
  parts.push(
    `<text x="${num(scale.plotLeft + scale.plotWidth / 2)}" y="${num(
      height - 16
    )}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="500" fill="${palette.text}">${escapeXml(document.xLabel || "Time")}</text>`
  )
  parts.push(
    `<text x="20" y="${num(
      scale.plotTop + scale.plotHeight / 2
    )}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="500" fill="${
      palette.text
    }" transform="rotate(-90 20 ${num(scale.plotTop + scale.plotHeight / 2)})">${escapeXml(document.yLabel || "Survival")}</text>`
  )
  if (legend) {
    const legendX = width - 164
    curves.forEach((curve, index) => {
      const y = 68 + index * 22
      const color = palette.series[index % palette.series.length]
      parts.push(`<rect x="${num(legendX)}" y="${num(y - 9)}" width="10" height="10" rx="2" fill="${color}" />`)
      parts.push(
        `<text x="${num(legendX + 16)}" y="${num(y)}" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(truncateLabel(curve.group, 18))}</text>`
      )
    })
  }
  parts.push("</svg>")
  return parts.join("")
}

function svgInner(markup: string): string {
  return markup.replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "")
}

function renderMultiPanelSvg(document: PlotDocument): string {
  const rects = plotPanelRects(document)
  if (!rects) return renderSinglePlotSvg(document)
  const palette = plotPalette(document.paletteId)
  const { width, height, background } = document.page
  const panelA = renderSinglePlotSvg(panelDocument(document, "a"))
  const panelB = renderSinglePlotSvg(panelDocument(document, "b"))
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(
      height
    )}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-labelledby="plot-title">`,
    `<title id="plot-title">${escapeXml(document.metadata.title)}</title>`,
    `<rect width="100%" height="100%" fill="${escapeXml(background)}" />`,
    `<svg data-panel="A" x="${num(rects.a.x)}" y="${num(rects.a.y)}" width="${num(
      rects.a.width
    )}" height="${num(rects.a.height)}" viewBox="0 0 ${num(rects.a.width)} ${num(
      rects.a.height
    )}">${svgInner(panelA)}</svg>`,
    `<text x="${num(rects.a.x + 16)}" y="${num(
      rects.a.y + 22
    )}" font-family="${FONT}" font-size="16" font-weight="600" fill="${palette.text}">A</text>`,
    `<svg data-panel="B" x="${num(rects.b.x)}" y="${num(rects.b.y)}" width="${num(
      rects.b.width
    )}" height="${num(rects.b.height)}" viewBox="0 0 ${num(rects.b.width)} ${num(
      rects.b.height
    )}">${svgInner(panelB)}</svg>`,
    `<text x="${num(rects.b.x + 16)}" y="${num(
      rects.b.y + 22
    )}" font-family="${FONT}" font-size="16" font-weight="600" fill="${palette.text}">B</text>`,
    "</svg>",
  ].join("")
}

function renderSinglePlotSvg(document: PlotDocument): string {
  if (document.chartType === "volcano") return renderVolcanoSvg(document)
  if (document.chartType === "survival") return renderSurvivalSvg(document)

  const palette = plotPalette(document.paletteId)
  const { width, height, background } = document.page

  const seriesColumns = document.seriesColumnIndices
  const seriesData = seriesColumns.map((columnIndex) => ({
    columnIndex,
    name: document.columns[columnIndex],
    values: document.rows.map((row) => numericCell(row[columnIndex] ?? "")),
  }))
  const xValues = document.rows.map((row) => row[document.xColumnIndex] ?? "")
  const xNumeric = document.rows.every((row) =>
    Number.isFinite(Number((row[document.xColumnIndex] ?? "").replace(/,/g, "")))
  )
  const xNumbers = xValues.map((value) => numericCell(value))

  const groups = document.chartType === "box" ? boxGroups(document) : []
  const allValues =
    document.chartType === "box"
      ? groups.flatMap((group) => group.values)
      : seriesData.flatMap((series) => series.values)
  const yMax = Math.max(0, ...allValues)
  const yMin =
    document.chartType === "box" || document.chartType === "heatmap"
      ? Math.min(...allValues)
      : Math.min(0, ...allValues)

  const legend = document.showLegend && seriesData.length > 1
  const scale: Scale = {
    plotLeft: 76,
    plotTop: 64,
    plotWidth: width - 76 - (legend ? 176 : 32),
    plotHeight: height - 64 - 76,
    yMin,
    yMax: yMax === yMin ? yMin + 1 : yMax,
  }

  const yFor = (value: number) =>
    scale.plotTop +
    scale.plotHeight -
    ((value - scale.yMin) / (scale.yMax - scale.yMin)) * scale.plotHeight

  const categoryCount = document.rows.length
  const bandWidth = scale.plotWidth / Math.max(1, categoryCount)
  const xForCategory = (index: number) => scale.plotLeft + index * bandWidth + bandWidth / 2
  const xMin = Math.min(...xNumbers)
  const xMax = Math.max(...xNumbers)
  const xForNumber = (value: number) =>
    scale.plotLeft +
    (xMax === xMin ? scale.plotWidth / 2 : ((value - xMin) / (xMax - xMin)) * scale.plotWidth)
  const xFor = (index: number) =>
    document.chartType === "bar" || document.chartType === "stacked" || !xNumeric
      ? xForCategory(index)
      : xForNumber(xNumbers[index])

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(
      height
    )}" viewBox="0 0 ${num(width)} ${num(height)}" role="img" aria-labelledby="plot-title">`
  )
  parts.push(`<title id="plot-title">${escapeXml(document.metadata.title)}</title>`)
  parts.push(`<rect width="100%" height="100%" fill="${escapeXml(background)}" />`)

  const ticks = niceTicks(scale.yMin, scale.yMax)
  if (document.chartType !== "pie" && document.chartType !== "heatmap" && document.showGrid) {
    for (const tick of ticks) {
      const y = yFor(tick)
      parts.push(
        `<line x1="${num(scale.plotLeft)}" y1="${num(y)}" x2="${num(
          scale.plotLeft + scale.plotWidth
        )}" y2="${num(y)}" stroke="${palette.grid}" stroke-width="1" />`
      )
    }
  }

  if (document.chartType !== "pie" && document.chartType !== "heatmap") {
    parts.push(
      `<line x1="${num(scale.plotLeft)}" y1="${num(scale.plotTop)}" x2="${num(
        scale.plotLeft
      )}" y2="${num(scale.plotTop + scale.plotHeight)}" stroke="${palette.axis}" stroke-width="1.5" />`
    )
    parts.push(
      `<line x1="${num(scale.plotLeft)}" y1="${num(yFor(0))}" x2="${num(
        scale.plotLeft + scale.plotWidth
      )}" y2="${num(yFor(0))}" stroke="${palette.axis}" stroke-width="1.5" />`
    )

    for (const tick of ticks) {
      parts.push(
        `<text x="${num(scale.plotLeft - 10)}" y="${num(yFor(tick) + 4)}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(formatTick(tick))}</text>`
      )
    }
  }

  if (document.chartType === "heatmap") {
    const cellWidth = scale.plotWidth / Math.max(1, seriesData.length)
    const cellHeight = scale.plotHeight / Math.max(1, document.rows.length)
    const heatMin = Math.min(...allValues)
    const heatMax = Math.max(...allValues)
    const span = heatMax === heatMin ? 1 : heatMax - heatMin
    const high = palette.series[0] ?? "#18181b"
    seriesData.forEach((series, columnIndex) => {
      series.values.forEach((value, rowIndex) => {
        const x = scale.plotLeft + columnIndex * cellWidth
        const y = scale.plotTop + (document.rows.length - 1 - rowIndex) * cellHeight
        parts.push(
          `<rect data-series="${escapeXml(series.name)}" data-row="${escapeXml(
            xValues[rowIndex] ?? ""
          )}" x="${num(x)}" y="${num(y)}" width="${num(Math.max(1, cellWidth - 1))}" height="${num(
            Math.max(1, cellHeight - 1)
          )}" fill="${mixHex("#ffffff", high, (value - heatMin) / span)}" />`
        )
      })
    })
    seriesData.forEach((series, columnIndex) => {
      parts.push(
        `<text x="${num(
          scale.plotLeft + columnIndex * cellWidth + cellWidth / 2
        )}" y="${num(scale.plotTop + scale.plotHeight + 20)}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(truncateLabel(series.name))}</text>`
      )
    })
    xValues.forEach((label, rowIndex) => {
      parts.push(
        `<text x="${num(scale.plotLeft - 10)}" y="${num(
          scale.plotTop + (document.rows.length - 1 - rowIndex) * cellHeight + cellHeight / 2 + 4
        )}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(truncateLabel(label))}</text>`
      )
    })
    parts.push(
      `<text x="${num(scale.plotLeft)}" y="34" font-family="${FONT}" font-size="18" font-weight="600" fill="${palette.text}">${escapeXml(document.metadata.title)}</text>`
    )
    parts.push(
      `<text x="${num(scale.plotLeft + scale.plotWidth / 2)}" y="${num(
        height - 16
      )}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="500" fill="${palette.text}">${escapeXml(document.xLabel || "Series")}</text>`
    )
    parts.push("</svg>")
    return parts.join("")
  }

  if (document.chartType === "pie") {
    const series = seriesData[0]
    const total = Math.max(
      1,
      series?.values.reduce((sum, value) => sum + Math.max(0, value), 0) ?? 1
    )
    const cx = scale.plotLeft + scale.plotWidth / 2
    const cy = scale.plotTop + scale.plotHeight / 2
    const radius = Math.min(scale.plotWidth, scale.plotHeight) / 2 - 8
    let angle = -Math.PI / 2
    series?.values.forEach((value, rowIndex) => {
      const slice = (Math.max(0, value) / total) * Math.PI * 2
      const next = angle + slice
      const large = slice > Math.PI ? 1 : 0
      const x1 = cx + Math.cos(angle) * radius
      const y1 = cy + Math.sin(angle) * radius
      const x2 = cx + Math.cos(next) * radius
      const y2 = cy + Math.sin(next) * radius
      const color = palette.series[rowIndex % palette.series.length]
      parts.push(
        `<path data-series="${escapeXml(xValues[rowIndex] || series.name)}" d="M ${num(cx)} ${num(
          cy
        )} L ${num(x1)} ${num(y1)} A ${num(radius)} ${num(radius)} 0 ${large} 1 ${num(x2)} ${num(
          y2
        )} Z" fill="${color}" />`
      )
      angle = next
    })
    parts.push(
      `<text x="${num(scale.plotLeft)}" y="34" font-family="${FONT}" font-size="18" font-weight="600" fill="${palette.text}">${escapeXml(document.metadata.title)}</text>`
    )
    if (legend || xValues.length > 0) {
      const legendX = width - 164
      xValues.forEach((label, index) => {
        const y = 68 + index * 22
        const color = palette.series[index % palette.series.length]
        parts.push(`<rect x="${num(legendX)}" y="${num(y - 9)}" width="10" height="10" rx="2" fill="${color}" />`)
        parts.push(
          `<text x="${num(legendX + 16)}" y="${num(y)}" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(truncateLabel(label, 18))}</text>`
        )
      })
    }
    parts.push("</svg>")
    return parts.join("")
  }

  const maxXLabels = Math.max(2, Math.floor(scale.plotWidth / 72))
  const labelEvery = Math.max(1, Math.ceil(categoryCount / maxXLabels))
  if (document.chartType === "box") {
    const boxBand = scale.plotWidth / Math.max(1, groups.length)
    groups.forEach((group, index) => {
      parts.push(
        `<text x="${num(scale.plotLeft + index * boxBand + boxBand / 2)}" y="${num(
          scale.plotTop + scale.plotHeight + 20
        )}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(truncateLabel(group.label))}</text>`
      )
    })
  } else if (document.chartType === "bar" || document.chartType === "stacked" || !xNumeric) {
    xValues.forEach((value, index) => {
      if (index % labelEvery !== 0 && index !== categoryCount - 1) return
      parts.push(
        `<text x="${num(xForCategory(index))}" y="${num(
          scale.plotTop + scale.plotHeight + 20
        )}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(truncateLabel(value))}</text>`
      )
    })
  } else {
    const xTicks = niceTicks(xMin, xMax, 6)
    for (const tick of xTicks) {
      parts.push(
        `<text x="${num(xForNumber(tick))}" y="${num(
          scale.plotTop + scale.plotHeight + 20
        )}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(formatTick(tick))}</text>`
      )
    }
  }

  if (document.chartType === "box") {
    const boxBand = scale.plotWidth / Math.max(1, groups.length)
    const boxWidth = boxBand * 0.42
    groups.forEach((group, index) => {
      const stats = quartiles(group.values)
      if (!stats) return
      const cx = scale.plotLeft + index * boxBand + boxBand / 2
      const color = palette.series[index % palette.series.length]
      parts.push(
        `<line data-series="${escapeXml(group.label)}" x1="${num(cx)}" y1="${num(
          yFor(stats.min)
        )}" x2="${num(cx)}" y2="${num(yFor(stats.max))}" stroke="${color}" stroke-width="1.5" />`
      )
      parts.push(
        `<line x1="${num(cx - boxWidth / 3)}" y1="${num(yFor(stats.min))}" x2="${num(
          cx + boxWidth / 3
        )}" y2="${num(yFor(stats.min))}" stroke="${color}" stroke-width="1.5" />`
      )
      parts.push(
        `<line x1="${num(cx - boxWidth / 3)}" y1="${num(yFor(stats.max))}" x2="${num(
          cx + boxWidth / 3
        )}" y2="${num(yFor(stats.max))}" stroke="${color}" stroke-width="1.5" />`
      )
      const top = yFor(stats.q3)
      const height = Math.max(1, yFor(stats.q1) - yFor(stats.q3))
      parts.push(
        `<rect data-series="${escapeXml(group.label)}" x="${num(
          cx - boxWidth / 2
        )}" y="${num(top)}" width="${num(boxWidth)}" height="${num(
          height
        )}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="1.5" />`
      )
      parts.push(
        `<line x1="${num(cx - boxWidth / 2)}" y1="${num(yFor(stats.median))}" x2="${num(
          cx + boxWidth / 2
        )}" y2="${num(yFor(stats.median))}" stroke="${palette.text}" stroke-width="2" />`
      )
      for (const outlier of stats.outliers) {
        parts.push(
          `<circle cx="${num(cx)}" cy="${num(yFor(outlier))}" r="3" fill="none" stroke="${color}" stroke-width="1.5" />`
        )
      }
    })
  }

  seriesData.forEach((series, seriesIndex) => {
    if (document.chartType === "box") return
    const color = palette.series[seriesIndex % palette.series.length]
    if (document.chartType === "bar" || document.chartType === "stacked") {
      const groupWidth = bandWidth * 0.72
      if (document.chartType === "stacked") {
        const stackedMax = document.rows.map((_, rowIndex) =>
          seriesData.reduce((sum, item) => sum + Math.max(0, item.values[rowIndex] ?? 0), 0)
        )
        const stackHi = Math.max(1, ...stackedMax)
        series.values.forEach((value, rowIndex) => {
          const prior = seriesData
            .slice(0, seriesIndex)
            .reduce((sum, item) => sum + Math.max(0, item.values[rowIndex] ?? 0), 0)
          const x = scale.plotLeft + rowIndex * bandWidth + (bandWidth - groupWidth) / 2
          const top = scale.plotTop + scale.plotHeight - ((prior + Math.max(0, value)) / stackHi) * scale.plotHeight
          const height = (Math.max(0, value) / stackHi) * scale.plotHeight
          parts.push(
            `<rect data-series="${escapeXml(series.name)}" x="${num(x)}" y="${num(top)}" width="${num(
              Math.max(1, groupWidth - 2)
            )}" height="${num(height)}" fill="${color}" />`
          )
        })
        return
      }
      const barWidth = groupWidth / seriesData.length
      series.values.forEach((value, rowIndex) => {
        const x =
          scale.plotLeft +
          rowIndex * bandWidth +
          (bandWidth - groupWidth) / 2 +
          seriesIndex * barWidth
        const y = yFor(Math.max(0, value))
        const barHeight = Math.abs(yFor(value) - yFor(0))
        parts.push(
          `<rect data-series="${escapeXml(series.name)}" x="${num(x)}" y="${num(y)}" width="${num(
            Math.max(1, barWidth - 2)
          )}" height="${num(barHeight)}" rx="2" fill="${color}" />`
        )
      })
      return
    }

    const points = series.values.map((value, rowIndex) => ({
      x: xFor(rowIndex),
      y: yFor(value),
    }))

    if (document.chartType === "area") {
      const baseline = yFor(0)
      const path = [
        `M ${num(points[0]?.x ?? scale.plotLeft)} ${num(baseline)}`,
        ...points.map((point) => `L ${num(point.x)} ${num(point.y)}`),
        `L ${num(points.at(-1)?.x ?? scale.plotLeft)} ${num(baseline)}`,
        "Z",
      ].join(" ")
      parts.push(`<path d="${path}" fill="${color}" fill-opacity="0.18" stroke="none" />`)
    }

    if (document.chartType === "line" || document.chartType === "area") {
      const path = points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${num(point.x)} ${num(point.y)}`)
        .join(" ")
      parts.push(
        `<path data-series="${escapeXml(series.name)}" d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`
      )
    }

    if (document.chartType === "scatter" || document.chartType === "line") {
      for (const point of points) {
        parts.push(
          `<circle data-series="${escapeXml(series.name)}" cx="${num(point.x)}" cy="${num(
            point.y
          )}" r="${document.chartType === "scatter" ? 4.5 : 3}" fill="${color}" />`
        )
      }
    }
  })

  parts.push(
    `<text x="${num(scale.plotLeft + scale.plotWidth / 2)}" y="${num(
      height - 16
    )}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="500" fill="${palette.text}">${escapeXml(document.xLabel)}</text>`
  )
  parts.push(
    `<text x="20" y="${num(
      scale.plotTop + scale.plotHeight / 2
    )}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="500" fill="${
      palette.text
    }" transform="rotate(-90 20 ${num(scale.plotTop + scale.plotHeight / 2)})">${escapeXml(document.yLabel)}</text>`
  )
  parts.push(
    `<text x="${num(scale.plotLeft)}" y="34" font-family="${FONT}" font-size="18" font-weight="600" fill="${palette.text}">${escapeXml(document.metadata.title)}</text>`
  )

  if (legend) {
    const legendX = width - 164
    seriesData.forEach((series, seriesIndex) => {
      const y = 68 + seriesIndex * 22
      const color = palette.series[seriesIndex % palette.series.length]
      parts.push(`<rect x="${num(legendX)}" y="${num(y - 9)}" width="10" height="10" rx="2" fill="${color}" />`)
      parts.push(
        `<text x="${num(legendX + 16)}" y="${num(y)}" font-family="${FONT}" font-size="12" fill="${palette.text}">${escapeXml(truncateLabel(series.name, 18))}</text>`
      )
    })
  }

  parts.push("</svg>")
  return parts.join("")
}

export function renderPlotSvg(document: PlotDocument): string {
  if (document.secondPanel) return renderMultiPanelSvg(document)
  return renderSinglePlotSvg(document)
}
