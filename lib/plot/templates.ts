import { plotDocumentFromTable, parseTable } from "./parse"
import { parsePlotDocument, type PlotDocument } from "./schema"

export type PlotTemplate = {
  id: string
  family: string
  title: string
  description: string
  csv: string
  build: () => PlotDocument
}

function templateFromCsv(
  title: string,
  description: string,
  csv: string,
  patch?: Partial<
    Pick<
      PlotDocument,
      "chartType" | "showLegend" | "yLabel" | "xLabel" | "xColumnIndex" | "seriesColumnIndices"
    >
  >
): PlotDocument {
  const table = parseTable(csv)
  if (!table) throw new Error(`Plot template "${title}" has invalid sample data.`)
  const document = plotDocumentFromTable({ table, title, description })
  if (!document) throw new Error(`Plot template "${title}" has no numeric series.`)
  return { ...document, ...patch }
}

export const plotTemplates: PlotTemplate[] = [
  {
    id: "grouped-bar",
    family: "Bar",
    title: "Treatment vs control",
    description: "Grouped bars for a categorical comparison.",
    csv: `step,treatment,control
Baseline,12,11
Week 2,18,12
Week 4,24,13
Week 8,29,14`,
    build: () =>
      templateFromCsv(
        "Treatment vs control",
        "Grouped comparison of treatment and control over study visits.",
        `step,treatment,control
Baseline,12,11
Week 2,18,12
Week 4,24,13
Week 8,29,14`
      ),
  },
  {
    id: "time-series",
    family: "Line",
    title: "Signal over time",
    description: "A line chart for a numeric x axis.",
    csv: `time,signal
0,2.1
1,2.8
2,3.4
3,3.1
4,4.6
5,5.2
6,4.9
7,6.1`,
    build: () =>
      templateFromCsv(
        "Signal over time",
        "Continuous measurement against a numeric time axis.",
        `time,signal
0,2.1
1,2.8
2,3.4
3,3.1
4,4.6
5,5.2
6,4.9
7,6.1`,
        { chartType: "line", showLegend: false, yLabel: "Signal" }
      ),
  },
  {
    id: "dose-response",
    family: "Scatter",
    title: "Dose response",
    description: "Scatter points for paired numeric measurements.",
    csv: `dose,response
0.1,8
0.3,14
1,27
3,41
10,52
30,58`,
    build: () =>
      templateFromCsv(
        "Dose response",
        "Paired dose and response values as a scatter chart.",
        `dose,response
0.1,8
0.3,14
1,27
3,41
10,52
30,58`,
        { chartType: "scatter", showLegend: false, yLabel: "Response" }
      ),
  },
  {
    id: "expression-heatmap",
    family: "Heatmap",
    title: "Gene expression",
    description: "A matrix heatmap for one value per gene and condition.",
    csv: `gene,untreated,treated,rescue
A,1.2,3.8,1.5
B,0.4,2.1,0.6
C,2.6,2.4,2.5
D,0.8,4.2,1.1
E,1.5,3.1,1.8`,
    build: () =>
      templateFromCsv(
        "Gene expression",
        "Condition-by-gene matrix rendered as a heatmap.",
        `gene,untreated,treated,rescue
A,1.2,3.8,1.5
B,0.4,2.1,0.6
C,2.6,2.4,2.5
D,0.8,4.2,1.1
E,1.5,3.1,1.8`,
        { chartType: "heatmap", showLegend: false, yLabel: "Gene" }
      ),
  },
  {
    id: "group-box",
    family: "Box",
    title: "Replicate spread",
    description: "Box plots of replicate values grouped by condition.",
    csv: `condition,rep1,rep2,rep3,rep4
Control,11,12,10,13
Control,12,11,14,12
Treated,18,21,19,22
Treated,20,17,23,19`,
    build: () =>
      templateFromCsv(
        "Replicate spread",
        "Grouped replicate measurements as box plots.",
        `condition,rep1,rep2,rep3,rep4
Control,11,12,10,13
Control,12,11,14,12
Treated,18,21,19,22
Treated,20,17,23,19`,
        { chartType: "box", showLegend: false, yLabel: "Signal" }
      ),
  },
  {
    id: "differential-volcano",
    family: "Volcano",
    title: "Differential expression",
    description: "log2 fold change versus p-value. Thresholds are visual only.",
    csv: `gene,log2fc,pvalue
A,2.4,0.0002
B,-1.8,0.0011
C,0.4,0.42
D,3.1,0.00004
E,-0.2,0.61
F,-2.6,0.0007
G,1.3,0.031
H,0.1,0.88`,
    build: () =>
      templateFromCsv(
        "Differential expression",
        "Precomputed log2 fold change and p-values as a volcano plot. Not a DE test.",
        `gene,log2fc,pvalue
A,2.4,0.0002
B,-1.8,0.0011
C,0.4,0.42
D,3.1,0.00004
E,-0.2,0.61
F,-2.6,0.0007
G,1.3,0.031
H,0.1,0.88`,
        {
          chartType: "volcano",
          showLegend: true,
          xColumnIndex: 1,
          seriesColumnIndices: [2],
          xLabel: "log2 fold change",
          yLabel: "−log10(p)",
        }
      ),
  },
  {
    id: "km-survival",
    family: "Survival",
    title: "Two-arm survival",
    description: "Kaplan–Meier from time, event (1/0), and group.",
    csv: `time,event,group
2,1,Control
4,0,Control
6,1,Control
8,0,Control
10,1,Control
12,0,Control
3,1,Treated
5,0,Treated
7,1,Treated
11,0,Treated
14,1,Treated
18,0,Treated`,
    build: () =>
      templateFromCsv(
        "Two-arm survival",
        "Kaplan–Meier step curves from time, event, and group. Not a Cox model.",
        `time,event,group
2,1,Control
4,0,Control
6,1,Control
8,0,Control
10,1,Control
12,0,Control
3,1,Treated
5,0,Treated
7,1,Treated
11,0,Treated
14,1,Treated
18,0,Treated`,
        {
          chartType: "survival",
          showLegend: true,
          xColumnIndex: 0,
          seriesColumnIndices: [1],
          xLabel: "Time",
          yLabel: "Survival",
        }
      ),
  },
  {
    id: "two-panel-response",
    family: "Multi-panel",
    title: "Bars and line together",
    description: "Two charts on one figure: grouped bars beside a line.",
    csv: `step,treatment,control
Baseline,12,11
Week 2,18,12
Week 4,24,13
Week 8,29,14`,
    build: () => {
      const document = templateFromCsv(
        "Treatment response",
        "Two-panel figure: grouped bars and a line from the same table.",
        `step,treatment,control
Baseline,12,11
Week 2,18,12
Week 4,24,13
Week 8,29,14`
      )
      return parsePlotDocument({
        ...document,
        layout: "side-by-side",
        page: { ...document.page, width: 1920 },
        secondPanel: {
          chartType: "line",
          xColumnIndex: document.xColumnIndex,
          seriesColumnIndices: document.seriesColumnIndices,
          xLabel: document.xLabel,
          yLabel: document.yLabel,
          title: "Trend",
        },
      })
    },
  },
]
