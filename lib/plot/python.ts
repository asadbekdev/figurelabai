import { panelDocument, plotLayoutOf } from "./panels"
import { numericCell } from "./parse"
import type { PlotDocument } from "./schema"
import { survivalCurves } from "./survival"

function pyStr(value: string): string {
  return JSON.stringify(value)
}

function pyNums(values: number[]): string {
  return `[${values.map((value) => (Number.isFinite(value) ? String(value) : "0")).join(", ")}]`
}

function pyStrs(values: string[]): string {
  return `[${values.map((value) => pyStr(value)).join(", ")}]`
}

function emitChart(document: PlotDocument, ax: string): string[] {
  const xValues = document.rows.map((row) => row[document.xColumnIndex] ?? "")
  const series = document.seriesColumnIndices.map((columnIndex) => ({
    name: document.columns[columnIndex] ?? `Series ${columnIndex + 1}`,
    values: document.rows.map((row) => numericCell(row[columnIndex] ?? "")),
  }))
  const xNumeric = xValues.every((value) => Number.isFinite(Number(value.replace(/,/g, ""))))
  const xNumbers = xValues.map((value) => numericCell(value))
  const prefix = ax === "ax" ? "" : `${ax}_`

  const lines = [
    `${prefix}title = ${pyStr(document.metadata.title)}`,
    `${prefix}x_label = ${pyStr(document.xLabel)}`,
    `${prefix}y_label = ${pyStr(document.yLabel)}`,
    `${prefix}x_labels = ${pyStrs(xValues)}`,
    `${prefix}x_values = ${pyNums(xNumbers)}`,
    `${prefix}series = [`,
    ...series.map(
      (item) => `    {"name": ${pyStr(item.name)}, "values": ${pyNums(item.values)}},`
    ),
    "]",
    `${ax}.set_title(${prefix}title)`,
    `${ax}.set_xlabel(${prefix}x_label)`,
    `${ax}.set_ylabel(${prefix}y_label)`,
  ]

  if (document.chartType === "volcano") {
    lines.push(
      "import math",
      `xs = ${prefix}x_values`,
      `ys_raw = ${prefix}series[0]["values"] if ${prefix}series else []`,
      "as_p = all(0 < value <= 1 for value in ys_raw) if ys_raw else False",
      "ys = [-math.log10(max(value, 1e-300)) if as_p else max(0, value) for value in ys_raw]",
      `${ax}.scatter(xs, ys, s=18)`,
      `${ax}.axvline(0, linestyle="--", linewidth=0.8)`,
      `${ax}.axhline(1.301, linestyle=":", linewidth=0.8)`,
      "# Visual thresholds only: |log2FC| >= 1 and p < 0.05. Not a DE test."
    )
  } else if (document.chartType === "survival") {
    const curves = survivalCurves(document)
    lines.push(
      "# Kaplan-Meier step curves computed in FigureLab. Not a Cox model or log-rank test.",
      `${prefix}curves = [`,
      ...curves.map(
        (curve) =>
          `    {"name": ${pyStr(curve.group)}, "times": ${pyNums(curve.points.map((point) => point.time))}, "survival": ${pyNums(curve.points.map((point) => point.survival))}},`
      ),
      "]",
      `for curve in ${prefix}curves:`,
      `    ${ax}.step(curve["times"], curve["survival"], where="post", label=curve["name"])`,
      `${ax}.set_ylim(0, 1.02)`
    )
  } else if (document.chartType === "heatmap") {
    lines.push(
      `matrix = [item["values"] for item in ${prefix}series]`,
      `image = ${ax}.imshow(list(zip(*matrix)) if matrix else [[]], aspect="auto", origin="upper")`,
      `${ax}.set_xticks(range(len(${prefix}series)), [item["name"] for item in ${prefix}series], rotation=30, ha="right")`,
      `${ax}.set_yticks(range(len(${prefix}x_labels)), ${prefix}x_labels)`,
      `fig.colorbar(image, ax=${ax}, shrink=0.8)`
    )
  } else if (document.chartType === "box") {
    lines.push(
      "from collections import OrderedDict",
      "groups = OrderedDict()",
      `for index, label in enumerate(${prefix}x_labels):`,
      "    groups.setdefault(label, [])",
      `    for item in ${prefix}series:`,
      "        if index < len(item[\"values\"]):",
      "            groups[label].append(item[\"values\"][index])",
      `${ax}.boxplot(list(groups.values()), tick_labels=list(groups.keys()))`
    )
  } else if (document.chartType === "pie") {
    lines.push(
      `values = ${prefix}series[0]["values"] if ${prefix}series else []`,
      `${ax}.pie(values, labels=${prefix}x_labels, autopct="%1.0f%%")`,
      `${ax}.set_xlabel("")`,
      `${ax}.set_ylabel("")`
    )
  } else if (document.chartType === "bar") {
    lines.push(
      "import numpy as np",
      `positions = np.arange(len(${prefix}x_labels))`,
      `width = 0.8 / max(1, len(${prefix}series))`,
      `for offset, item in enumerate(${prefix}series):`,
      `    ${ax}.bar(positions + offset * width, item["values"], width=width, label=item["name"])`,
      `${ax}.set_xticks(positions + width * (len(${prefix}series) - 1) / 2, ${prefix}x_labels)`
    )
  } else if (document.chartType === "stacked") {
    lines.push(
      "import numpy as np",
      `positions = np.arange(len(${prefix}x_labels))`,
      `bottom = np.zeros(len(${prefix}x_labels))`,
      `for item in ${prefix}series:`,
      `    ${ax}.bar(positions, item["values"], bottom=bottom, label=item["name"])`,
      "    bottom = bottom + np.array(item[\"values\"])",
      `${ax}.set_xticks(positions, ${prefix}x_labels)`
    )
  } else if (document.chartType === "area") {
    lines.push(
      `xs = ${prefix}x_values if ${xNumeric ? "True" : "False"} else list(range(len(${prefix}x_labels)))`,
      `for item in ${prefix}series:`,
      `    ${ax}.fill_between(xs, item["values"], alpha=0.18)`,
      `    ${ax}.plot(xs, item["values"], label=item["name"])`,
      `if not ${xNumeric ? "True" : "False"}:`,
      `    ${ax}.set_xticks(xs, ${prefix}x_labels)`
    )
  } else {
    lines.push(
      `xs = ${prefix}x_values if ${xNumeric ? "True" : "False"} else list(range(len(${prefix}x_labels)))`,
      `marker = ${document.chartType === "scatter" ? pyStr("o") : pyStr("")}`,
      `linestyle = ${document.chartType === "scatter" ? pyStr("None") : pyStr("-")}`,
      `for item in ${prefix}series:`,
      `    ${ax}.plot(xs, item["values"], label=item["name"], marker=marker or None, linestyle=linestyle)`,
      `if not ${xNumeric ? "True" : "False"}:`,
      `    ${ax}.set_xticks(xs, ${prefix}x_labels)`
    )
  }

  if (document.showGrid && document.chartType !== "pie") {
    lines.push(`${ax}.grid(True, axis="y", linestyle=":", linewidth=0.6)`)
  }
  if (document.showLegend && document.chartType !== "pie" && document.chartType !== "heatmap") {
    lines.push(`${ax}.legend()`)
  }
  return lines
}

export function createPlotPython(document: PlotDocument): string {
  const widthIn = Number((document.page.width / 96).toFixed(2))
  const heightIn = Number((document.page.height / 96).toFixed(2))
  const lines = [
    "# Recreate this FigureLab chart with matplotlib.",
    "# Generated from the live plot editor — edit the lists, then run:",
    "#   python figure.py",
    "",
    "import matplotlib.pyplot as plt",
    "",
  ]

  if (document.secondPanel) {
    const layout = plotLayoutOf(document)
    const rows = layout === "stacked" ? 2 : 1
    const cols = layout === "stacked" ? 1 : 2
    lines.push(
      `fig, axes = plt.subplots(${rows}, ${cols}, figsize=(${widthIn}, ${heightIn}))`,
      "ax_a, ax_b = axes.ravel()",
      ...emitChart(panelDocument(document, "a"), "ax_a"),
      ...emitChart(panelDocument(document, "b"), "ax_b")
    )
  } else {
    lines.push(
      `fig, ax = plt.subplots(figsize=(${widthIn}, ${heightIn}))`,
      ...emitChart(document, "ax")
    )
  }

  lines.push(
    "fig.tight_layout()",
    "fig.savefig(\"figure.svg\")",
    "fig.savefig(\"figure.png\", dpi=200)",
    "plt.show()",
    ""
  )

  return lines.join("\n")
}
