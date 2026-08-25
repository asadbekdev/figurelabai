import { RECOLOR_PALETTES, WHITE_BG_PROMPT } from "@/lib/product/image-edit"
import { sizeForAspect, type ImageOutputSize } from "@/lib/generation/image-size"
import { getImageOffering } from "@/lib/generation/offerings"
import {
  ENHANCE_INSTRUCTION,
  FLOWCHART_AS_IMAGE_INSTRUCTION,
  IMAGE_TO_FIGURE_INSTRUCTION,
  REFERENCE_TO_FIGURE_INSTRUCTION,
  SKETCH_TO_FIGURE_INSTRUCTION,
  VISUAL_CONSISTENCY_INSTRUCTION,
} from "@/lib/product/illustration-input"

import type { GeneratedImage, GenerateImageInput } from "../model-provider"

const VARIANT_FILLS = ["#f4f4f5", "#eff6ff", "#f0fdf4", "#fff7ed"] as const
const VARIANT_INKS = ["#18181b", "#1e3a8a", "#14532d", "#7f1d1d"] as const

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function hashSeed(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function decodeSourceSvg(source?: { mimeType: string; data: string }): string | null {
  if (!source || source.mimeType !== "image/svg+xml") return null
  try {
    return Buffer.from(source.data, "base64").toString("utf8")
  } catch {
    return null
  }
}

function replaceAttribute(svg: string, tag: string, name: string, value: string): string {
  const pattern = new RegExp(`(<${tag}\\b[^>]*\\s${name}=")([^"]*)(")`, "i")
  if (pattern.test(svg)) return svg.replace(pattern, `$1${value}$3`)
  return svg.replace(new RegExp(`<${tag}\\b`, "i"), `<${tag} ${name}="${value}"`)
}

function setSvgSize(svg: string, width: number, height: number): string {
  let next = replaceAttribute(svg, "svg", "width", String(width))
  next = replaceAttribute(next, "svg", "height", String(height))
  if (!/viewBox=/i.test(next)) {
    next = next.replace(/<svg\b/i, `<svg viewBox="0 0 ${width} ${height}"`)
  }
  return next
}

function applyRecolor(svg: string, colors: readonly string[]): string {
  let next = svg
  const fills = [...svg.matchAll(/fill="(#[0-9a-f]{3,8})"/gi)].map((match) => match[1])
  const unique = [...new Set(fills)]
  unique.forEach((current, index) => {
    next = next.replaceAll(`fill="${current}"`, `fill="${colors[index % colors.length]}"`)
  })
  return next
}

function applyTextEdit(svg: string, prompt: string): string {
  const quoted = /Rename\s+"([^"]+)"\s+to\s+"([^"]+)"/i.exec(prompt)
  if (quoted) return svg.replaceAll(quoted[1], quoted[2])
  const colon = /Edit the text in this figure:\s*(.+)$/i.exec(prompt)
  if (!colon) return svg
  return svg.replace(
    /(>)(Fixture illustration|Fixture plot)(<\/text>)/i,
    `$1${escapeXml(colon[1].slice(0, 72))}$3`
  )
}

function applyRegion(svg: string, prompt: string): string {
  const left = /about (\d+)% from the left/i.exec(prompt)
  const top = /about (\d+)% from the top/i.exec(prompt)
  const width = /about (\d+)% of the width/i.exec(prompt)
  const height = /about (\d+)% of the height/i.exec(prompt)
  const instruction = /In that region:\s*(.+?)(?:\s+Keep everything|$)/i.exec(prompt)
  if (!left || !top || !width || !height) return svg
  const x = Number(left[1])
  const y = Number(top[1])
  const w = Number(width[1])
  const h = Number(height[1])
  const label = escapeXml((instruction?.[1] ?? "Region edit").slice(0, 48))
  const mark = `<rect x="${x}%" y="${y}%" width="${w}%" height="${h}%" fill="none" stroke="#18181b" stroke-dasharray="4 3"/><text x="${
    x + 1
  }%" y="${y + 8}%" font-family="system-ui,sans-serif" font-size="14" fill="#18181b">${label}</text>`
  return svg.replace("</svg>", `${mark}</svg>`)
}

function applyAspect(svg: string, ratio: GenerateImageInput["aspectRatio"]): string {
  const sizes = {
    square: [720, 720],
    portrait: [720, 960],
    landscape: [960, 720],
    wide: [960, 540],
    auto: [960, 540],
  } as const
  const [width, height] = sizes[ratio ?? "auto"]
  return setSvgSize(svg, width, height)
}

function applyOutputSize(
  svg: string,
  size: ImageOutputSize | undefined,
  aspect: GenerateImageInput["aspectRatio"]
): string {
  if (!size || size === "1k") return svg
  const next = sizeForAspect(size, aspect ?? "auto")
  return setSvgSize(svg, next.width, next.height)
}

function applyUpscale(svg: string, prompt: string): string {
  const fourK = /4096 px|4K/i.test(prompt)
  const twoK = /2048 px|2K/i.test(prompt)
  const width = Number(/width="(\d+(?:\.\d+)?)"/i.exec(svg)?.[1] ?? 960)
  const height = Number(/height="(\d+(?:\.\d+)?)"/i.exec(svg)?.[1] ?? 540)
  if (fourK || twoK) {
    const size = fourK ? "4k" : "2k"
    const ratio = width / Math.max(1, height)
    const long = size === "4k" ? 4096 : 2048
    return ratio >= 1
      ? setSvgSize(svg, long, Math.round(long / ratio))
      : setSvgSize(svg, Math.round(long * ratio), long)
  }
  return setSvgSize(svg, Math.round(width * 2), Math.round(height * 2))
}

function buildBaseSvg(input: GenerateImageInput, kind: "illustration" | "plot"): string {
  const seed = hashSeed(`${input.prompt}\0${input.seed ?? "0"}`)
  const variant = seed % VARIANT_FILLS.length
  const fill = VARIANT_FILLS[variant]
  const ink = VARIANT_INKS[variant]
  const title = escapeXml((input.prompt || kind).slice(0, 72))
  const modeNote =
    input.inputMode === "enhance"
      ? "Enhance Figure"
      : input.inputMode === "sketch"
        ? "Sketch to Figure"
        : input.inputMode === "image"
          ? "Image to Figure"
          : input.inputMode === "reference"
            ? "Add Ref Figure"
            : input.visualConsistency
              ? "Visual consistency locked"
              : input.paletteColors?.length
                ? `Palette ${input.paletteColors.slice(0, 3).join(" ")}`
                : input.style && input.style !== "publication"
                  ? `${input.style} style`
                  : input.sourceImage
                    ? "Reference image attached"
                    : `Fixture ${kind} · variant ${variant + 1}`
  const offering = input.offering ? getImageOffering(input.offering) : null
  const offeringNote = offering
    ? offering.id === "fixture"
      ? "Fixture offering"
      : `${offering.label} · offline fixture`
    : ""
  const subtitle =
    kind === "plot"
      ? escapeXml((input.tabularData ?? "sample,value\\nA,12\\nB,19").slice(0, 80))
      : escapeXml(modeNote)
  const width = input.aspectRatio === "square" ? 720 : input.aspectRatio === "portrait" ? 720 : 960
  const height = input.aspectRatio === "square" ? 720 : input.aspectRatio === "portrait" ? 960 : input.aspectRatio === "landscape" ? 720 : 540
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${fill}"/><circle cx="${
    80 + variant * 24
  }" cy="200" r="36" fill="${ink}"/><text x="48" y="72" font-family="system-ui,sans-serif" font-size="28" fill="${ink}">${
    kind === "plot" ? "Fixture plot" : "Fixture illustration"
  }</text><text x="48" y="116" font-family="system-ui,sans-serif" font-size="16" fill="#3f3f46">${title}</text><text x="48" y="148" font-family="system-ui,sans-serif" font-size="14" fill="#71717a">${subtitle}</text>${
    offeringNote
      ? `<text x="48" y="228" font-family="system-ui,sans-serif" font-size="13" fill="#52525b">${escapeXml(offeringNote)}</text>`
      : ""
  }</svg>`
}

export function buildFixtureImage(
  input: GenerateImageInput,
  kind: "illustration" | "plot"
): GeneratedImage {
  let svg = decodeSourceSvg(input.sourceImage) ?? buildBaseSvg(input, kind)
  const prompt = input.prompt

  const palette = RECOLOR_PALETTES.find((item) => prompt.includes(item.label) && prompt.includes("Recolor"))
  if (palette) svg = applyRecolor(svg, palette.colors)
  if (prompt.includes("pure white background") || prompt.startsWith(WHITE_BG_PROMPT.slice(0, 20))) {
    svg = replaceAttribute(svg, "rect", "fill", "#ffffff")
  }
  if (/Recompose this figure at a /i.test(prompt) || input.aspectRatio) {
    const named = /at a (Square|Portrait|Landscape|Wide) aspect/i.exec(prompt)?.[1]?.toLowerCase()
    svg = applyAspect(
      svg,
      (named as GenerateImageInput["aspectRatio"]) ?? input.aspectRatio
    )
  }
  if (/Edit the text in this figure/i.test(prompt) || /Rename\s+"/i.test(prompt)) {
    svg = applyTextEdit(svg, prompt)
  }
  if (/Redraw only one region/i.test(prompt)) {
    svg = applyRegion(svg, prompt)
  }
  if (
    /Redraw this figure at approximately|2×|2x the current|2048 px|4096 px/i.test(prompt)
  ) {
    svg = applyUpscale(svg, prompt)
  }
  if (input.imageSize) {
    svg = applyOutputSize(svg, input.imageSize, input.aspectRatio)
  }
  if (input.style === "line-art") {
    svg = replaceAttribute(svg, "rect", "fill", "#ffffff")
    svg = svg.replace(/fill="(?!#ffffff|#fff")(#[0-9a-f]{3,8})"/gi, 'fill="none"')
  }
  if (input.inputMode === "enhance" || prompt.includes(ENHANCE_INSTRUCTION.slice(0, 24))) {
    svg = svg.replace("</svg>", `<text x="48" y="180" font-family="system-ui,sans-serif" font-size="14" fill="#3f3f46">Enhanced from attached figure</text></svg>`)
  }
  if (input.inputMode === "sketch" || prompt.includes(SKETCH_TO_FIGURE_INSTRUCTION.slice(0, 24))) {
    svg = svg.replace("</svg>", `<text x="48" y="180" font-family="system-ui,sans-serif" font-size="14" fill="#3f3f46">Converted from sketch</text></svg>`)
  }
  if (input.inputMode === "image" || prompt.includes(IMAGE_TO_FIGURE_INSTRUCTION.slice(0, 24))) {
    svg = svg.replace("</svg>", `<text x="48" y="180" font-family="system-ui,sans-serif" font-size="14" fill="#3f3f46">Converted from source image</text></svg>`)
  }
  if (input.inputMode === "reference" || prompt.includes(REFERENCE_TO_FIGURE_INSTRUCTION.slice(0, 24))) {
    svg = svg.replace("</svg>", `<text x="48" y="180" font-family="system-ui,sans-serif" font-size="14" fill="#3f3f46">Matched to reference figure</text></svg>`)
  }
  if (prompt.includes(FLOWCHART_AS_IMAGE_INSTRUCTION.slice(0, 24))) {
    svg = svg.replace("</svg>", `<text x="48" y="180" font-family="system-ui,sans-serif" font-size="14" fill="#3f3f46">Flowchart drawn as a figure image</text></svg>`)
  }
  if (input.visualConsistency || prompt.includes(VISUAL_CONSISTENCY_INSTRUCTION.slice(0, 24))) {
    svg = svg.replace("</svg>", `<text x="48" y="204" font-family="system-ui,sans-serif" font-size="13" fill="#52525b">Style locked to reference</text></svg>`)
  }
  if (input.paletteColors && input.paletteColors.length > 0) {
    svg = applyRecolor(svg, input.paletteColors)
  }

  return {
    mimeType: "image/svg+xml",
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  }
}
