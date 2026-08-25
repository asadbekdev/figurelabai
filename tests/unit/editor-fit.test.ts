import { describe, expect, it } from "vitest"

import {
  anchoredEditorViewport,
  editorFitViewOptions,
  shouldRefitEditor,
} from "../../lib/flowchart/editor-fit"

describe("editor fit policy", () => {
  it("opens desktop diagrams at a readable scale without changing global zoom-out", () => {
    expect(editorFitViewOptions(1_080, 0)).toMatchObject({
      minZoom: 0.75,
      maxZoom: 1.25,
    })
  })

  it("keeps compact canvas labels legible while allowing deliberate zoom-out", () => {
    expect(editorFitViewOptions(390, 0)).toMatchObject({
      minZoom: 0.6,
      maxZoom: 0.9,
    })
  })

  it("top-anchors a tall desktop diagram when readable fit clips its height", () => {
    const viewport = anchoredEditorViewport({
      size: { width: 1_080, height: 620 },
      bounds: { x: 80, y: 120, width: 520, height: 1_800 },
      viewport: { x: 240, y: -160, zoom: 0.5 },
    })

    expect(viewport).toEqual({ x: 240, y: -24, zoom: 0.5 })
  })

  it("left-anchors a wide desktop diagram without disturbing vertical centering", () => {
    const viewport = anchoredEditorViewport({
      size: { width: 680, height: 560 },
      bounds: { x: -420, y: 140, width: 1_440, height: 380 },
      viewport: { x: -250, y: 80, zoom: 0.75 },
    })

    expect(viewport).toEqual({ x: 331, y: 80, zoom: 0.75 })
  })

  it("top- and left-anchors overflowing content on a compact canvas", () => {
    const viewport = anchoredEditorViewport({
      size: { width: 390, height: 640 },
      bounds: { x: 80, y: 80, width: 1_524, height: 720 },
      viewport: { x: -30, y: 110, zoom: 0.6 },
    })

    expect(viewport).toEqual({ x: -32, y: -12, zoom: 0.6 })
  })

  it("refits only after operations that replace or re-layout the whole document", () => {
    expect(shouldRefitEditor("Revised flowchart loaded")).toBe(true)
    expect(shouldRefitEditor("Imported flowchart loaded")).toBe(true)
    expect(shouldRefitEditor("Auto-layout top bottom")).toBe(true)
    expect(shouldRefitEditor("Node updated")).toBe(false)
    expect(shouldRefitEditor("Node position updated")).toBe(false)
  })
})
