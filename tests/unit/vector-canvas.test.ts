import { describe, expect, it } from "vitest"

import { createDrawnVectorObject } from "@/lib/vector-canvas/create-shape"
import { svgMarkupFromDataUrl, vectorDocumentFromSvg } from "@/lib/vector-canvas/from-svg"
import {
  hitTestTopVectorObject,
  moveVectorObject,
  moveVectorObjects,
  vectorObjectLabel,
} from "@/lib/vector-canvas/objects"
import { renderVectorDocumentSvg } from "@/lib/vector-canvas/render"
import { VECTOR_INK } from "@/lib/vector-canvas/schema"
import { patchVectorObjectStyle } from "@/lib/vector-canvas/style"
import { objectsInRect, toggleSelectedIds } from "@/lib/vector-canvas/selection"
import { createMemoryVectorStorage } from "@/lib/vector-canvas/storage"

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><path d="M10 10h80v40H10z" fill="#18181b"/></svg>`

describe("vector document", () => {
  it("parses a traced SVG into a re-openable document", () => {
    const document = vectorDocumentFromSvg({ svg: SAMPLE, title: "Traced figure" })
    expect(document.kind).toBe("vector")
    expect(document.paths).toHaveLength(1)
    expect(document.page.width).toBe(320)
    expect(document.objects).toEqual([])
    expect(renderVectorDocumentSvg(document)).toContain(document.paths[0].d)
    expect(renderVectorDocumentSvg(document)).toContain('data-path-index="0"')
  })

  it("opens an illustration SVG with shapes and text, not only path tags", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="100%" height="100%" fill="#f4f4f5"/><circle cx="80" cy="200" r="36" fill="#18181b"/><text x="48" y="72" font-size="28" fill="#18181b">Fixture illustration</text></svg>`
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    expect(svgMarkupFromDataUrl(encoded)).toContain("<circle")
    const document = vectorDocumentFromSvg({ svg: encoded, title: "Fixture illustration" })
    expect(document.paths).toEqual([])
    expect(document.page.background).toBe("#f4f4f5")
    expect(document.objects.some((object) => object.type === "ellipse")).toBe(true)
    expect(document.objects.some((object) => object.type === "text")).toBe(true)
  })

  it("keeps a pencil stroke in the exported SVG", () => {
    const document = vectorDocumentFromSvg({ svg: SAMPLE, title: "Traced figure" })
    const withStroke = {
      ...document,
      objects: [
        {
          id: "stroke-1",
          type: "pencil" as const,
          points: [
            { x: 12, y: 16 },
            { x: 40, y: 28 },
          ],
          stroke: "#18181b",
          strokeWidth: 2,
        },
      ],
    }
    const svg = renderVectorDocumentSvg(withStroke)
    expect(svg).toContain('data-object-id="stroke-1"')
    expect(svg).toContain("M 12 16")
    expect(svg).toContain('stroke-linecap="round"')
  })

  it("draws line, ellipse, and image objects into the exported SVG", () => {
    const document = vectorDocumentFromSvg({ svg: SAMPLE, title: "Marks" })
    const line = createDrawnVectorObject({
      tool: "line",
      start: { x: 10, y: 10 },
      end: { x: 80, y: 40 },
    })
    const ellipse = createDrawnVectorObject({
      tool: "ellipse",
      start: { x: 20, y: 20 },
      end: { x: 80, y: 60 },
    })
    const image = {
      id: "img-1",
      type: "image" as const,
      x: 12,
      y: 16,
      width: 40,
      height: 24,
      href: "data:image/png;base64,AAAA",
    }
    expect(line?.type).toBe("line")
    expect(ellipse?.type).toBe("ellipse")
    const svg = renderVectorDocumentSvg({
      ...document,
      objects: [line!, ellipse!, image],
    })
    expect(svg).toContain("<line ")
    expect(svg).toContain("<ellipse ")
    expect(svg).toContain("<image ")
    expect(svg).toContain(image.href)
    expect(vectorObjectLabel(line!)).toBe("Line")
    expect(vectorObjectLabel(ellipse!)).toBe("Ellipse")
    expect(vectorObjectLabel(image)).toBe("Image")
  })

  it("moves a line and hit-tests near the stroke", () => {
    const line = createDrawnVectorObject({
      tool: "line",
      start: { x: 0, y: 0 },
      end: { x: 40, y: 0 },
    })
    expect(line).not.toBeNull()
    const moved = moveVectorObject(line!, 10, 5)
    expect(moved.type).toBe("line")
    if (moved.type !== "line") throw new Error("Expected line")
    expect(moved.x1).toBe(10)
    expect(moved.y1).toBe(5)
    expect(hitTestTopVectorObject([moved], 30, 5)?.id).toBe(moved.id)
    expect(hitTestTopVectorObject([moved], 200, 200)).toBeNull()
  })

  it("selects several objects with a drag box and shift toggle", () => {
    const a = {
      id: "a",
      type: "rect" as const,
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      fill: VECTOR_INK,
    }
    const b = {
      id: "b",
      type: "rect" as const,
      x: 80,
      y: 10,
      width: 20,
      height: 20,
      fill: VECTOR_INK,
    }
    const hits = objectsInRect([a, b], { x: 0, y: 0, width: 50, height: 50 })
    expect(hits.map((object) => object.id)).toEqual(["a"])
    expect(toggleSelectedIds(["a"], "b")).toEqual(["a", "b"])
    const moved = moveVectorObjects([a, b], ["a", "b"], 5, 0)
    expect(moved[0]?.type === "rect" && moved[0].x).toBe(15)
    expect(moved[1]?.type === "rect" && moved[1].x).toBe(85)
  })

  it("applies HEX fill, dash, and opacity to the exported SVG", () => {
    const document = vectorDocumentFromSvg({ svg: SAMPLE, title: "Styled" })
    const styled = patchVectorObjectStyle(
      {
        id: "rect-1",
        type: "rect",
        x: 8,
        y: 8,
        width: 40,
        height: 24,
        fill: "#18181b",
      },
      { fill: "#1e40af", stroke: "#18181b", dash: 4, opacity: 0.5 }
    )
    const svg = renderVectorDocumentSvg({ ...document, objects: [styled] })
    expect(svg).toContain('fill="#1e40af"')
    expect(svg).toContain('stroke="#18181b"')
    expect(svg).toContain('stroke-dasharray="4 4"')
    expect(svg).toContain('opacity="0.5"')
  })

  it("updates stroke width on line and pencil objects", () => {
    const line = createDrawnVectorObject({
      tool: "line",
      start: { x: 0, y: 0 },
      end: { x: 40, y: 0 },
    })
    expect(line?.type).toBe("line")
    const thicker = patchVectorObjectStyle(line!, { strokeWidth: 8 })
    expect(thicker.type).toBe("line")
    if (thicker.type !== "line") throw new Error("Expected line")
    expect(thicker.strokeWidth).toBe(8)
    const svg = renderVectorDocumentSvg({
      ...vectorDocumentFromSvg({ svg: SAMPLE, title: "Stroke" }),
      objects: [thicker],
    })
    expect(svg).toContain('stroke-width="8"')
  })

  it("stores and reopens the same document", async () => {
    const storage = createMemoryVectorStorage()
    const created = await storage.put(vectorDocumentFromSvg({ svg: SAMPLE, title: "Keep" }))
    const fetched = await storage.get(created.id)
    expect(fetched?.title).toBe("Keep")
    expect(fetched?.paths[0]?.d).toBe("M10 10h80v40H10z")
  })
})
