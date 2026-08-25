import { z } from "zod"

import type { ImageOutputSize } from "./image-size"

export const IMAGE_OFFERING_IDS = [
  "nano-banana",
  "nano-banana-pro",
  "nano-banana-2",
  "fixture",
] as const

export const imageOfferingIdSchema = z.enum(IMAGE_OFFERING_IDS)

export type ImageOfferingId = z.infer<typeof imageOfferingIdSchema>

const LEGACY_IMAGE_OFFERINGS: Record<string, ImageOfferingId> = {
  "gpt-image-2": "nano-banana",
  "gpt-image-1.5": "nano-banana",
  "seedream-5": "nano-banana",
  "seedream-4.5": "nano-banana",
  "flux-2-max": "nano-banana",
  "sora": "nano-banana",
}

export const imageOfferingSchema = z
  .string()
  .transform((value) => LEGACY_IMAGE_OFFERINGS[value] ?? value)
  .pipe(imageOfferingIdSchema)

export type ImageOfferingBackend = "gemini" | "fixture"

export type ImageOffering = {
  id: ImageOfferingId
  label: string
  hint: string
  backend: ImageOfferingBackend
  figureLabsName: string
  temperature: number
  preferredModels: string[]
  imageSizes: ImageOutputSize[]
  composerVisible: boolean
  instruction: string
}

/**
 * Official Gemini Image / Nano Banana IDs this workspace can call.
 * Google lists these as Nano Banana, Nano Banana Pro, and Nano Banana 2.
 */
export const IMAGE_OFFERINGS: ImageOffering[] = [
  {
    id: "nano-banana",
    label: "Nano Banana",
    hint: "gemini-2.5-flash-image · 1K",
    backend: "gemini",
    figureLabsName: "Nano Banana",
    temperature: 0.65,
    preferredModels: ["gemini-2.5-flash-image"],
    imageSizes: ["1k"],
    composerVisible: true,
    instruction:
      "You are Nano Banana (Gemini 2.5 Flash Image, model gemini-2.5-flash-image). Draft quickly. Favor a simple, readable composition over dense detail.",
  },
  {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    hint: "gemini-3-pro-image · 1K–4K",
    backend: "gemini",
    figureLabsName: "Nano Banana Pro",
    temperature: 0.35,
    preferredModels: ["gemini-3-pro-image", "gemini-3-pro-image-preview"],
    imageSizes: ["1k", "2k", "4k"],
    composerVisible: true,
    instruction:
      "You are Nano Banana Pro (Gemini 3 Pro Image, model gemini-3-pro-image). Reason about structure first. Prefer hierarchical scientific diagrams, conservative composition, and precise labels over decorative rendering.",
  },
  {
    id: "nano-banana-2",
    label: "Nano Banana 2",
    hint: "gemini-3.1-flash-image · 1K–4K",
    backend: "gemini",
    figureLabsName: "Nano Banana 2",
    temperature: 0.5,
    preferredModels: ["gemini-3.1-flash-image", "gemini-3.1-flash-image-preview"],
    imageSizes: ["1k", "2k", "4k"],
    composerVisible: true,
    instruction:
      "You are Nano Banana 2 (Gemini 3.1 Flash Image, model gemini-3.1-flash-image). Work as a fast generalist. Honor every attached reference. Keep the figure crisp at the requested size.",
  },
  {
    id: "fixture",
    label: "Fixture",
    hint: "Offline demo output",
    backend: "fixture",
    figureLabsName: "Fixture",
    temperature: 0,
    preferredModels: [],
    imageSizes: ["1k", "2k", "4k"],
    composerVisible: true,
    instruction: "Offline fixture offering. Do not call a live image API.",
  },
]

export const DEFAULT_IMAGE_OFFERING: ImageOfferingId = "nano-banana"

export type ComposerModelChoice = ImageOfferingId

export const COMPOSER_MODEL_OPTIONS: Array<{
  value: ComposerModelChoice
  label: string
  hint: string
}> = IMAGE_OFFERINGS.filter((item) => item.composerVisible).map((item) => ({
  value: item.id,
  label: item.label,
  hint: item.hint,
}))

export function offeringFromComposerModel(
  model: ComposerModelChoice | "server"
): ImageOfferingId | undefined {
  return model === "server" ? undefined : model
}

export function getImageOffering(id: ImageOfferingId | undefined): ImageOffering {
  return IMAGE_OFFERINGS.find((item) => item.id === id) ?? IMAGE_OFFERINGS[0]
}

export function providerChoiceForOffering(
  id: ImageOfferingId | "server" | undefined
): "gemini" | "fixture" | undefined {
  if (!id || id === "server") return undefined
  return getImageOffering(id).backend
}

export function offeringModels(
  id: ImageOfferingId | undefined,
  fallback: string[]
): string[] {
  const offering = getImageOffering(id)
  const preferred = offering.preferredModels.filter(Boolean)
  return preferred.length > 0 ? [...new Set(preferred)] : [...new Set(fallback)]
}

export function supportedImageSizes(
  id: ImageOfferingId | "server" | undefined
): ImageOutputSize[] {
  return getImageOffering(id === "server" ? undefined : id).imageSizes
}

export function clampOfferingImageSize(
  id: ImageOfferingId | "server" | undefined,
  size: ImageOutputSize | undefined
): ImageOutputSize {
  const supported = supportedImageSizes(id)
  if (size && supported.includes(size)) return size
  return supported[0] ?? "1k"
}
