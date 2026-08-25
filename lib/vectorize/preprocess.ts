import sharp from "sharp"

import type { VectorizePreprocess } from "./options"

export type PreprocessMode = "original" | "contrast-threshold" | "invert-threshold"

function otsuThreshold(histogram: number[], total: number): number {
  let sum = 0
  for (let value = 0; value < 256; value += 1) {
    sum += value * (histogram[value] ?? 0)
  }
  let sumBackground = 0
  let weightBackground = 0
  let maxVariance = 0
  let threshold = 128
  for (let value = 0; value < 256; value += 1) {
    weightBackground += histogram[value] ?? 0
    if (weightBackground === 0) continue
    const weightForeground = total - weightBackground
    if (weightForeground === 0) break
    sumBackground += value * (histogram[value] ?? 0)
    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sum - sumBackground) / weightForeground
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = value
    }
  }
  return threshold
}

async function grayscaleStats(input: Buffer): Promise<{
  histogram: number[]
  total: number
  min: number
  max: number
  mean: number
  width: number
  height: number
}> {
  const { data, info } = await sharp(input).grayscale().raw().toBuffer({ resolveWithObject: true })
  const histogram = Array.from({ length: 256 }, () => 0)
  let sum = 0
  let min = 255
  let max = 0
  for (const value of data) {
    histogram[value] += 1
    sum += value
    if (value < min) min = value
    if (value > max) max = value
  }
  return {
    histogram,
    total: data.length,
    min,
    max,
    mean: data.length === 0 ? 0 : sum / data.length,
    width: info.width,
    height: info.height,
  }
}

export function preprocessSequence(mode: VectorizePreprocess = "auto"): PreprocessMode[] {
  if (mode === "none") return ["original"]
  return ["contrast-threshold", "invert-threshold", "original"]
}

export async function preprocessForTrace(input: Buffer, mode: PreprocessMode): Promise<Buffer> {
  if (mode === "original") return input

  const normalized = await sharp(input).grayscale().normalise().png().toBuffer()
  const stats = await grayscaleStats(normalized)
  if (stats.max - stats.min < 8) {
    return sharp({
      create: {
        width: Math.max(1, stats.width),
        height: Math.max(1, stats.height),
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer()
  }
  const threshold = otsuThreshold(stats.histogram, stats.total)
  const invert = mode === "invert-threshold" || (mode === "contrast-threshold" && stats.mean < 118)

  let pipeline = sharp(normalized)
  if (invert) pipeline = pipeline.negate()
  return pipeline.threshold(threshold).png().toBuffer()
}
