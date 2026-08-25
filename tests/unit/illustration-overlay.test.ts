import { describe, expect, it } from "vitest"

import {
  createIllustrationOverlay,
  parseIllustrationOverlay,
  renderIllustrationSvg,
} from "@/lib/illustration/overlay"
import { hitTestTopVectorObject, moveVectorObject } from "@/lib/vector-canvas/objects"
import { VECTOR_INK } from "@/lib/vector-canvas/schema"
import { renderVectorDocumentSvg } from "@/lib/vector-canvas/render"
import { parseVectorDocument } from "@/lib/vector-canvas/schema"

describe("illustration overlay", () => {
  it("parses a stored overlay and renders the image plus marks", () => {
    const overlay = createIllustrationOverlay({
      projectId: "11111111-1111-4111-8111-111111111111",
      assetId: "asset-1",
      width: 640,
      height: 360,
      objects: [
        {
          id: "label",
          type: "text",
          x: 24,
          y: 40,
          text: "Nucleus",
          fill: VECTOR_INK,
          fontSize: 18,
        },
        {
          id: "box",
          type: "rect",
          x: 80,
          y: 80,
          width: 40,
          height: 24,
          fill: VECTOR_INK,
        },
        {
          id: "frame",
          type: "frame",
          x: 120,
          y: 60,
          width: 80,
          height: 50,
          stroke: VECTOR_INK,
        },
        {
          id: "line",
          type: "line",
          x1: 10,
          y1: 12,
          x2: 40,
          y2: 28,
          stroke: VECTOR_INK,
          strokeWidth: 2,
        },
        {
          id: "ellipse",
          type: "ellipse",
          x: 50,
          y: 20,
          width: 30,
          height: 18,
          stroke: VECTOR_INK,
        },
      ],
    })

    const parsed = parseIllustrationOverlay(overlay)
    const svg = renderIllustrationSvg({
      title: "PCR figure",
      imageHref: "data:image/png;base64,AAAA",
      page: parsed.page,
      objects: parsed.objects,
    })

    expect(parsed.kind).toBe("illustration-overlay")
    expect(svg).toContain("<image ")
    expect(svg).toContain('data-object-id="label"')
    expect(svg).toContain("Nucleus")
    expect(svg).toContain('data-object-id="box"')
    expect(svg).toContain('data-object-id="frame"')
    expect(svg).toContain('data-object-id="line"')
    expect(svg).toContain('data-object-id="ellipse"')
    expect(svg).toContain('fill="none"')
    expect(parsed.comments).toEqual([])
  })

  it("persists comments without putting them in the export SVG", () => {
    const overlay = createIllustrationOverlay({
      projectId: "11111111-1111-4111-8111-111111111111",
      assetId: "asset-1",
      width: 640,
      height: 360,
      comments: [
        {
          id: "c1",
          x: 40,
          y: 80,
          text: "Relabel the nucleus",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    })
    const parsed = parseIllustrationOverlay(overlay)
    expect(parsed.comments).toHaveLength(1)
    expect(parsed.comments[0]?.text).toBe("Relabel the nucleus")
    const svg = renderIllustrationSvg({
      title: "PCR figure",
      imageHref: "data:image/png;base64,AAAA",
      page: parsed.page,
      objects: parsed.objects,
    })
    expect(svg).not.toContain("Relabel the nucleus")
  })

  it("reads an older overlay that has no comments field", () => {
    const parsed = parseIllustrationOverlay({
      kind: "illustration-overlay",
      schemaVersion: 1,
      projectId: "11111111-1111-4111-8111-111111111111",
      assetId: "asset-1",
      page: { width: 640, height: 360 },
      objects: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
    expect(parsed.comments).toEqual([])
  })

  it("moves and hit-tests overlay objects", () => {
    const text = {
      id: "label",
      type: "text" as const,
      x: 20,
      y: 40,
      text: "A",
      fill: VECTOR_INK,
      fontSize: 16,
    }
    const moved = moveVectorObject(text, 10, -5)
    expect(moved.type).toBe("text")
    if (moved.type !== "text") throw new Error("Expected text")
    expect(moved.x).toBe(30)
    expect(moved.y).toBe(35)
    expect(hitTestTopVectorObject([moved], 32, 34)?.id).toBe("label")
    expect(hitTestTopVectorObject([moved], 200, 200)).toBeNull()
  })

  it("moves and hit-tests a pencil stroke", () => {
    const stroke = {
      id: "stroke",
      type: "pencil" as const,
      points: [
        { x: 10, y: 10 },
        { x: 40, y: 18 },
        { x: 70, y: 12 },
      ],
      stroke: VECTOR_INK,
      strokeWidth: 2,
    }
    const moved = moveVectorObject(stroke, 5, 0)
    expect(moved.type).toBe("pencil")
    if (moved.type === "pencil") {
      expect(moved.points[0]?.x).toBe(15)
    }
    expect(hitTestTopVectorObject([moved], 45, 18)?.id).toBe("stroke")
    expect(hitTestTopVectorObject([moved], 200, 200)).toBeNull()
  })

  it("keeps frame objects in a vector document export", () => {
    const document = parseVectorDocument({
      kind: "vector",
      schemaVersion: 1,
      id: "vec-1",
      title: "Traced",
      page: { width: 200, height: 120, background: "#ffffff" },
      paths: [{ d: "M10 10h20v10H10z", fill: VECTOR_INK }],
      objects: [
        {
          id: "frame-1",
          type: "frame",
          x: 12,
          y: 16,
          width: 40,
          height: 24,
          stroke: VECTOR_INK,
        },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
    expect(renderVectorDocumentSvg(document)).toContain('data-object-id="frame-1"')
  })
})
