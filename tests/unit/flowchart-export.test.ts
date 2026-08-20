import { XMLParser, XMLValidator } from "fast-xml-parser"
import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { demoFlowchartDocument } from "../../lib/flowchart/fixture"
import { cloneFlowchartDocument } from "../../lib/flowchart/schema"
import { renderFlowchartSvg } from "../../lib/flowchart/svg"

describe("renderFlowchartSvg", () => {
  it("creates parseable vector content for every semantic object", () => {
    const svg = renderFlowchartSvg(demoFlowchartDocument, {
      background: "document",
    })
    const validation = XMLValidator.validate(svg)
    const parsed = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    }).parse(svg)

    expect(validation).toBe(true)
    expect(parsed.svg["@_viewBox"]).toBe("0 0 1120 720")
    expect(svg).not.toContain("<foreignObject")

    for (const node of demoFlowchartDocument.nodes) {
      expect(svg).toContain(`data-object-id="${node.id}"`)
    }
    for (const edge of demoFlowchartDocument.edges) {
      expect(svg).toContain(`data-object-id="${edge.id}"`)
    }
  })

  it("escapes metadata and supports transparent output", () => {
    const document = cloneFlowchartDocument(demoFlowchartDocument)
    document.metadata.title = "PCR & RNA <review>"
    const svg = renderFlowchartSvg(document, {
      background: "transparent",
    })

    expect(XMLValidator.validate(svg)).toBe(true)
    expect(svg).toContain("<title id=\"figure-title\">PCR &amp; RNA &lt;review&gt;</title>")
    expect(svg).not.toContain('<rect width="100%" height="100%"')
  })

  it("rasterizes to a non-blank PNG at the requested dimensions", async () => {
    const svg = renderFlowchartSvg(demoFlowchartDocument, {
      background: "document",
    })
    const image = sharp(Buffer.from(svg)).resize({
      width: demoFlowchartDocument.page.width * 2,
      height: demoFlowchartDocument.page.height * 2,
      fit: "fill",
    })
    const png = await image.png().toBuffer()
    const metadata = await sharp(png).metadata()
    const stats = await sharp(png).stats()

    expect(metadata.format).toBe("png")
    expect(metadata.width).toBe(2240)
    expect(metadata.height).toBe(1440)
    expect(png.byteLength).toBeGreaterThan(10_000)
    expect(stats.channels.some((channel) => channel.stdev > 0)).toBe(true)
  })
})
