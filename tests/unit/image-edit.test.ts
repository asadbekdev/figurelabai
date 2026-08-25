import { describe, expect, it } from "vitest"

import {
  RECOLOR_PALETTES,
  WHITE_BG_PROMPT,
  aspectEditPrompt,
  recolorPrompt,
  regionRedrawPrompt,
  textEditPrompt,
  UPSCALE_LIMIT,
  UPSCALE_PROMPT,
} from "@/lib/product/image-edit"

describe("image edit prompt builders", () => {
  it("recolor prompt carries the palette colors and preservation rules", () => {
    const palette = RECOLOR_PALETTES[1]
    const prompt = recolorPrompt(palette)
    expect(prompt).toContain(palette.label)
    for (const color of palette.colors) {
      expect(prompt).toContain(color)
    }
    expect(prompt).toContain("unchanged")
  })

  it("white background prompt asks for pure white and preservation", () => {
    expect(WHITE_BG_PROMPT).toContain("#ffffff")
    expect(WHITE_BG_PROMPT).toContain("unchanged")
  })

  it("aspect prompt names the ratio", () => {
    expect(aspectEditPrompt("wide")).toContain("Wide")
    expect(aspectEditPrompt("portrait")).toContain("Portrait")
  })

  it("text edit prompt includes the instruction", () => {
    expect(textEditPrompt('Rename "PCR" to "qPCR"')).toContain('Rename "PCR" to "qPCR"')
  })

  it("region prompt localizes the edit in percentages", () => {
    const prompt = regionRedrawPrompt(
      { x: 0.25, y: 0.5, width: 0.4, height: 0.2 },
      "replace the icon with a microscope"
    )
    expect(prompt).toContain("25% from the left")
    expect(prompt).toContain("50% from the top")
    expect(prompt).toContain("40% of the width")
    expect(prompt).toContain("20% of the height")
    expect(prompt).toContain("replace the icon with a microscope")
    expect(prompt).toContain("outside that region unchanged")
  })

  it("upscale prompt is honest about Gemini limits", () => {
    expect(UPSCALE_PROMPT).toContain("2048")
    expect(UPSCALE_PROMPT).toContain("2K")
    expect(UPSCALE_PROMPT).toContain(UPSCALE_LIMIT)
    expect(UPSCALE_LIMIT).toMatch(/not a dedicated/i)
  })
})
