import { describe, expect, it } from "vitest"

import { recolorPrompt, RECOLOR_PALETTES, UPSCALE_PROMPT } from "@/lib/product/image-edit"

import {
  buildFixtureFlowchart,
  buildFixturePlan,
  FixtureModelProvider,
  resetFixtureFailures,
} from "../../lib/generation/providers/fixture"
import { buildFixtureImage } from "../../lib/generation/providers/fixture-image"
import { normalizeFlowchartDocument } from "../../lib/generation/normalize-flowchart"

describe("fixture provider", () => {
  it("builds a deterministic labeled plan from a prompt", () => {
    const plan = buildFixturePlan(
      "Show a three-step PCR workflow from sample collection to analysis."
    )

    expect(plan.planVersion).toBe(1)
    expect(plan.mode).toBe("flowchart")
    expect(plan.assumptions[0]).toMatch(/fixture provider/)
    expect(plan.structure.sections.length).toBeGreaterThanOrEqual(3)
    expect(buildFixturePlan("Show a three-step PCR workflow from sample collection to analysis.")).toEqual(
      plan
    )
  })

  it("returns a normalizable flowchart document", () => {
    const plan = buildFixturePlan("Collect, extract, amplify, analyze")
    const document = normalizeFlowchartDocument(buildFixtureFlowchart({ prompt: plan.goal, plan }), {
      prompt: plan.goal,
      plan,
    })

    expect(document.nodes.length).toBeGreaterThanOrEqual(3)
    expect(document.edges.length).toBeGreaterThanOrEqual(2)
    expect(document.metadata.title).toBe(plan.title)
  })

  it("fails a draft once so retry can succeed", async () => {
    resetFixtureFailures()
    const provider = new FixtureModelProvider()
    const prompt = "Please fail the draft for PCR"
    const signal = new AbortController().signal

    await expect(provider.createFlowchart({ prompt }, signal)).rejects.toMatchObject({
      code: "DOCUMENT_INVALID",
      retryable: true,
    })
    await expect(provider.createFlowchart({ prompt }, signal)).resolves.toBeTruthy()
  })

  it("varies fixture illustrations by seed so variants are distinguishable", () => {
    const first = buildFixtureImage(
      { prompt: "A labeled cell diagram", seed: "variant-a" },
      "illustration"
    )
    const second = buildFixtureImage(
      { prompt: "A labeled cell diagram", seed: "variant-b" },
      "illustration"
    )
    expect(first.dataUrl).not.toBe(second.dataUrl)
    expect(decodeURIComponent(first.dataUrl).includes("variant")).toBe(true)
  })

  it("applies recolor and 2x upscale edits without a live model", () => {
    const base = buildFixtureImage({ prompt: "Pathway map", seed: "edit" }, "illustration")
    const inline = base.dataUrl.replace("data:image/svg+xml;charset=utf-8,", "")
    const source = {
      mimeType: "image/svg+xml" as const,
      data: Buffer.from(decodeURIComponent(inline), "utf8").toString("base64"),
    }
    const recolored = buildFixtureImage(
      { prompt: recolorPrompt(RECOLOR_PALETTES[1]), sourceImage: source, seed: "edit" },
      "illustration"
    )
    const upscaled = buildFixtureImage(
      { prompt: UPSCALE_PROMPT, sourceImage: source, seed: "edit" },
      "illustration"
    )
    expect(decodeURIComponent(recolored.dataUrl)).toContain(RECOLOR_PALETTES[1].colors[1])
    expect(decodeURIComponent(upscaled.dataUrl)).toMatch(/width="2048"/)
  })
})
