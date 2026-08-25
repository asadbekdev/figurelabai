import { describe, expect, it } from "vitest"

import { composeIllustrationPrompt, JOURNAL_PALETTE_PRESETS } from "@/lib/product/illustration-input"
import { upscalePrompt, UPSCALE_8K_LIMIT, UPSCALE_LIMIT } from "@/lib/product/image-edit"
import { longEdgeForSize, sizeForAspect } from "@/lib/generation/image-size"
import { illustrationStyleSchema, illustrationInputModeSchema } from "@/lib/generation/contracts"
import { buildFixtureImage } from "@/lib/generation/providers/fixture-image"

describe("illustration input modes", () => {
  it("enhance, sketch, image, and reference modes append real generation instructions", () => {
    const enhance = composeIllustrationPrompt({
      prompt: "Sharpen the labels",
      inputMode: "enhance",
    })
    const sketch = composeIllustrationPrompt({
      prompt: "A PCR workflow",
      inputMode: "sketch",
    })
    const image = composeIllustrationPrompt({
      prompt: "A lab photo of a gel",
      inputMode: "image",
    })
    const reference = composeIllustrationPrompt({
      prompt: "A new pathway in the same look",
      inputMode: "reference",
    })
    expect(enhance).toContain("Enhance the attached figure")
    expect(sketch).toContain("Convert the attached sketch")
    expect(image).toContain("Convert the attached image")
    expect(reference).toContain("Use the attached reference figure")
    expect(reference).toContain("Visual-consistency lock")
  })

  it("does not duplicate instructions when composed twice", () => {
    const once = composeIllustrationPrompt({
      prompt: "A PCR workflow",
      inputMode: "image",
      generateAsImage: true,
    })
    const twice = composeIllustrationPrompt({
      prompt: once,
      inputMode: "image",
      generateAsImage: true,
    })
    expect(twice.match(/Convert the attached image/g)?.length).toBe(1)
    expect(twice.match(/publication-style flowchart figure image/g)?.length).toBe(1)
  })

  it("visual consistency and extracted palette change the prompt", () => {
    const prompt = composeIllustrationPrompt({
      prompt: "Redraw the pathway",
      visualConsistency: true,
      paletteColors: ["#18181b", "#eff6ff"],
    })
    expect(prompt).toContain("Visual-consistency lock")
    expect(prompt).toContain("#18181b")
    expect(prompt).toContain("#eff6ff")
  })

  it("journal palettes are named presets with portable hex colors", () => {
    expect(JOURNAL_PALETTE_PRESETS.map((item) => item.id)).toEqual([
      "nature",
      "cell",
      "science",
      "lancet",
      "graphite",
    ])
    for (const preset of JOURNAL_PALETTE_PRESETS) {
      expect(preset.colors.length).toBeGreaterThanOrEqual(4)
      for (const color of preset.colors) {
        expect(color).toMatch(/^#[0-9a-f]{3,8}$/i)
      }
    }
  })

  it("contracts accept FigureLabs-named styles and input modes", () => {
    for (const style of ["flat", "2.5d", "3d", "hand-drawn", "publication"] as const) {
      expect(illustrationStyleSchema.safeParse(style).success).toBe(true)
    }
    for (const mode of ["text", "image", "sketch", "enhance", "reference"] as const) {
      expect(illustrationInputModeSchema.safeParse(mode).success).toBe(true)
    }
  })

  it("fixture image reflects sketch style and 2K size", () => {
    const image = buildFixtureImage(
      {
        prompt: "A labeled cell",
        style: "sketch",
        inputMode: "sketch",
        imageSize: "2k",
        seed: "size-2k",
      },
      "illustration"
    )
    const svg = decodeURIComponent(image.dataUrl)
    expect(svg).toMatch(/width="2048"/)
    expect(svg).toContain("Sketch to Figure")
  })

  it("fixture image reflects image-to-figure, 2.5D, and flowchart-as-image", () => {
    const image = buildFixtureImage(
      {
        prompt: composeIllustrationPrompt({
          prompt: "Restyle this diagram",
          inputMode: "image",
          generateAsImage: true,
        }),
        style: "2.5d",
        inputMode: "image",
        seed: "figure-image",
      },
      "illustration"
    )
    const svg = decodeURIComponent(image.dataUrl)
    expect(svg).toContain("Image to Figure")
    expect(svg).toContain("Converted from source image")
    expect(svg).toContain("Flowchart drawn as a figure image")
  })

  it("fixture upscale to 4K scales the SVG", () => {
    const base = buildFixtureImage({ prompt: "Pathway", seed: "up" }, "illustration")
    const inline = base.dataUrl.replace("data:image/svg+xml;charset=utf-8,", "")
    const source = {
      mimeType: "image/svg+xml" as const,
      data: Buffer.from(decodeURIComponent(inline), "utf8").toString("base64"),
    }
    const upscaled = buildFixtureImage(
      { prompt: upscalePrompt("4k"), sourceImage: source, seed: "up" },
      "illustration"
    )
    expect(decodeURIComponent(upscaled.dataUrl)).toMatch(/width="4096"/)
  })

  it("fixture image stamps a named offering without claiming a live vendor API", () => {
    const image = buildFixtureImage(
      {
        prompt: "A labeled cell",
        offering: "nano-banana",
        seed: "offering-gpt",
      },
      "illustration"
    )
    expect(decodeURIComponent(image.dataUrl)).toContain("Nano Banana")
    expect(decodeURIComponent(image.dataUrl)).toContain("offline fixture")
  })

  it("2K and 4K sizes are explicit pixel edges", () => {
    expect(longEdgeForSize("2k")).toBe(2048)
    expect(longEdgeForSize("4k")).toBe(4096)
    expect(sizeForAspect("2k", "square")).toEqual({ width: 2048, height: 2048 })
    expect(UPSCALE_LIMIT).toMatch(/not a dedicated/i)
    expect(UPSCALE_8K_LIMIT).toMatch(/not available/i)
  })
})
