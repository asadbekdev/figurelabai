import { describe, expect, it } from "vitest"

import { parseFlowchartDocument } from "@/lib/flowchart/schema"
import { renderFlowchartSvg } from "@/lib/flowchart/svg"
import { flowchartTemplates, illustrationStarters } from "@/lib/flowchart/templates"
import { renderPlotSvg } from "@/lib/plot/render"
import { parsePlotDocument } from "@/lib/plot/schema"
import { plotTemplates } from "@/lib/plot/templates"

describe("flowchart templates", () => {
  it("cover the documented families", () => {
    const families = new Set(flowchartTemplates.map((template) => template.family))
    for (const family of [
      "Flowchart",
      "Model architecture",
      "Cycle diagram",
      "Timeline",
      "PRISMA",
      "CONSORT",
      "Fishbone",
    ]) {
      expect(families.has(family)).toBe(true)
    }
  })

  for (const template of flowchartTemplates) {
    it(`${template.title} builds a valid, renderable document`, () => {
      const document = template.build()
      expect(() => parseFlowchartDocument(document)).not.toThrow()
      expect(document.nodes.length).toBeGreaterThanOrEqual(4)
      expect(document.edges.length).toBeGreaterThanOrEqual(3)

      const svg = renderFlowchartSvg(document, { background: "document" })
      for (const node of document.nodes) {
        expect(svg).toContain(`data-object-id="${node.id}"`)
      }
      const positions = new Set(
        document.nodes.map((node) => `${Math.round(node.position.x)}:${Math.round(node.position.y)}`)
      )
      expect(positions.size).toBe(document.nodes.length)
    })
  }
})

describe("plot templates", () => {
  it("cover bar, line, and scatter families", () => {
    const families = new Set(plotTemplates.map((template) => template.family))
    expect(families.has("Bar")).toBe(true)
    expect(families.has("Line")).toBe(true)
    expect(families.has("Scatter")).toBe(true)
    expect(families.has("Heatmap")).toBe(true)
    expect(families.has("Box")).toBe(true)
    expect(families.has("Volcano")).toBe(true)
    expect(families.has("Survival")).toBe(true)
  })

  for (const template of plotTemplates) {
    it(`${template.title} builds a valid, renderable plot`, () => {
      const document = template.build()
      expect(() => parsePlotDocument(document)).not.toThrow()
      expect(document.rows.length).toBeGreaterThanOrEqual(4)
      const svg = renderPlotSvg(document)
      expect(svg).toContain("<svg")
      expect(svg).toContain(document.metadata.title)
    })
  }
})

describe("illustration starters", () => {
  it("carry usable prompts", () => {
    expect(illustrationStarters.length).toBeGreaterThanOrEqual(4)
    for (const starter of illustrationStarters) {
      expect(starter.prompt.length).toBeGreaterThan(40)
      expect(starter.title.length).toBeGreaterThan(3)
    }
  })
})
