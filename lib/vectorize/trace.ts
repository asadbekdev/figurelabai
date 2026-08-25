import { Potrace, trace as potraceTrace } from "potrace"
import sharp, { type OutputInfo } from "sharp"

import { GenerationError } from "../generation/errors"

import type { VectorizeDetail, VectorizePreprocess } from "./options"
import { preprocessForTrace, preprocessSequence } from "./preprocess"

export type { VectorizeDetail } from "./options"

const DETAIL_SETTINGS: Record<VectorizeDetail, { turdSize: number; optTolerance: number }> = {
  draft: { turdSize: 40, optTolerance: 0.8 },
  balanced: { turdSize: 8, optTolerance: 0.4 },
  fine: { turdSize: 2, optTolerance: 0.2 },
}

const MAX_TRACE_DIMENSION = 1_600
const MAX_INPUT_BYTES = 8 * 1_024 * 1_024

export type VectorizeInput = {
  data: Buffer
  detail?: VectorizeDetail
  threshold?: number
  inkColor?: string
  preprocess?: VectorizePreprocess
}

export type VectorizeResult = {
  svg: string
  width: number
  height: number
  pathCount: number
}

function countedTracePaths(svg: string): number {
  return [...svg.matchAll(/<path\b[^>]*>/g)].filter((match) => {
    const drawn = /d="([^"]*)"/.exec(match[0])?.[1] ?? ""
    return /[A-Za-z]/.test(drawn)
  }).length
}

function runTrace(
  image: Buffer,
  options: { turdSize: number; optTolerance: number; threshold?: number; inkColor: string }
): Promise<string> {
  return new Promise((resolve, reject) => {
    potraceTrace(
      image,
      {
        turdSize: options.turdSize,
        optTolerance: options.optTolerance,
        threshold: options.threshold ?? Potrace.THRESHOLD_AUTO,
        color: options.inkColor,
      },
      (error, svg) => {
        if (error) {
          reject(error)
          return
        }
        resolve(svg)
      }
    )
  })
}

export async function vectorizeRaster(input: VectorizeInput): Promise<VectorizeResult> {
  if (input.data.byteLength === 0) {
    throw new GenerationError("VECTORIZE_EMPTY", "The image payload was empty.", {
      status: 422,
      retryable: false,
    })
  }
  if (input.data.byteLength > MAX_INPUT_BYTES) {
    throw new GenerationError(
      "UPLOAD_TOO_LARGE",
      "That image is larger than 8 MB. Export a smaller copy and try again.",
      { status: 413, retryable: false }
    )
  }

  let prepared: { data: Buffer; info: OutputInfo }
  try {
    prepared = await sharp(input.data, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: MAX_TRACE_DIMENSION,
        height: MAX_TRACE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer({ resolveWithObject: true })
  } catch {
    throw new GenerationError(
      "VECTORIZE_UNREADABLE",
      "That image could not be decoded. Use a PNG, JPEG, or WebP raster image.",
      { status: 422, retryable: false }
    )
  }

  const { data, info } = prepared
  if (info.width < 8 || info.height < 8) {
    throw new GenerationError(
      "VECTORIZE_TOO_SMALL",
      "That image is too small to trace. Use an image of at least 8 × 8 pixels.",
      { status: 422, retryable: false }
    )
  }

  const detail = DETAIL_SETTINGS[input.detail ?? "balanced"]
  const inkColor = input.inkColor ?? "#18181b"
  const attempts = preprocessSequence(input.preprocess)

  let lastError: unknown
  for (const attempt of attempts) {
    try {
      const prepared = await preprocessForTrace(data, attempt)
      // Pass a PNG buffer. Do not construct a Jimp instance here — Next.js/Turbopack
      // can load a different Jimp copy than potrace, so `instanceof Jimp` fails and
      // potrace then calls Jimp.read() on the object.
      const svg = await runTrace(prepared, { ...detail, threshold: input.threshold, inkColor })
      const pathCount = countedTracePaths(svg)
      if (pathCount > 0) {
        return { svg, width: info.width, height: info.height, pathCount }
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastError && !(lastError instanceof GenerationError)) {
    const reason = lastError instanceof Error ? lastError.message : "unknown tracer error"
    console.error("[vectorize] potrace failed:", reason)
    throw new GenerationError(
      "VECTORIZE_FAILED",
      "The image could not be traced. Try a higher-contrast copy.",
      { status: 422, retryable: true }
    )
  }

  throw new GenerationError(
    "VECTORIZE_EMPTY_RESULT",
    "Tracing found no shapes after contrast, threshold, and invert passes. Use a clearer silhouette or a higher-contrast image.",
    { status: 422, retryable: false }
  )
}
