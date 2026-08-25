import { describe, expect, it } from "vitest"

import { geminiImageSizeForModel } from "@/lib/generation/image-size"
import { buildFixtureImage } from "@/lib/generation/providers/fixture-image"
import {
  DEFAULT_IMAGE_OFFERING,
  IMAGE_OFFERINGS,
  clampOfferingImageSize,
  getImageOffering,
  imageOfferingSchema,
  offeringFromComposerModel,
  offeringModels,
  providerChoiceForOffering,
} from "@/lib/generation/offerings"

describe("image offerings", () => {
  it("lists official Nano Banana models and fixture only", () => {
    const ids = IMAGE_OFFERINGS.map((item) => item.id)
    expect(ids).toEqual(["nano-banana", "nano-banana-pro", "nano-banana-2", "fixture"])
    expect(DEFAULT_IMAGE_OFFERING).toBe("nano-banana")
    expect(getImageOffering("nano-banana").preferredModels).toEqual(["gemini-2.5-flash-image"])
    expect(getImageOffering("nano-banana-pro").preferredModels[0]).toBe("gemini-3-pro-image")
    expect(getImageOffering("nano-banana-2").preferredModels[0]).toBe("gemini-3.1-flash-image")
    for (const offering of IMAGE_OFFERINGS) {
      if (offering.id === "fixture") {
        expect(offering.backend).toBe("fixture")
        continue
      }
      expect(offering.backend).toBe("gemini")
      expect(offering.hint).toMatch(/^gemini-/)
      expect(offering.instruction.toLowerCase()).toContain(offering.preferredModels[0])
    }
  })

  it("maps composer choices to Gemini or fixture without fake vendors", () => {
    expect(providerChoiceForOffering("nano-banana")).toBe("gemini")
    expect(providerChoiceForOffering("nano-banana-pro")).toBe("gemini")
    expect(providerChoiceForOffering("fixture")).toBe("fixture")
    expect(providerChoiceForOffering("server")).toBeUndefined()
    expect(offeringFromComposerModel("server")).toBeUndefined()
    expect(offeringFromComposerModel("nano-banana")).toBe("nano-banana")
    expect(imageOfferingSchema.parse("flux-2-max")).toBe("nano-banana")
    expect(imageOfferingSchema.parse("sora")).toBe("nano-banana")
  })

  it("keeps each live offering on its own Gemini image model", () => {
    expect(offeringModels("nano-banana-pro", ["gemini-2.5-flash-image"])).toEqual([
      "gemini-3-pro-image",
      "gemini-3-pro-image-preview",
    ])
    expect(offeringModels("nano-banana", ["gemini-3-pro-image"])).toEqual([
      "gemini-2.5-flash-image",
    ])
    expect(clampOfferingImageSize("nano-banana", "4k")).toBe("1k")
    expect(clampOfferingImageSize("nano-banana-pro", "4k")).toBe("4k")
    expect(geminiImageSizeForModel("gemini-2.5-flash-image", "4k")).toBe("1K")
    expect(geminiImageSizeForModel("gemini-3-pro-image", "4k")).toBe("4K")
    expect(geminiImageSizeForModel("gemini-3.1-flash-lite-image", "2k")).toBe("1K")
  })

  it("stamps the selected offering on fixture images", () => {
    const image = buildFixtureImage(
      {
        prompt: "A labeled pathway",
        offering: "nano-banana-pro",
        seed: "offering",
      },
      "illustration"
    )
    const svg = decodeURIComponent(image.dataUrl)
    expect(svg).toContain("Nano Banana Pro")
    expect(svg).toContain("offline fixture")
  })
})
