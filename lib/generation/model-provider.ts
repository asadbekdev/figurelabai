import type { FlowchartDocument } from "../flowchart/schema"

import type {
  FigurePlan,
  IllustrationInputMode,
  IllustrationStyle,
  ImageAspectRatio,
  ImageOfferingId,
  ImageOutputSize,
  SourceImage,
  SourceText,
} from "./contracts"

export type UnknownJson = unknown

export type PlanInput = {
  prompt: string
  sourceText?: SourceText
  sourceImage?: SourceImage
}

export type GenerateFlowchartInput = {
  prompt: string
  plan?: FigurePlan
  sourceText?: SourceText
  sourceImage?: SourceImage
}

export type ReviseFlowchartInput = {
  prompt: string
  document: FlowchartDocument
  plan?: FigurePlan
  sourceText?: SourceText
  sourceImage?: SourceImage
}

export type GeneratedImage = {
  mimeType: string
  dataUrl: string
  warning?: string
}

export type GenerateImageInput = {
  prompt: string
  aspectRatio?: ImageAspectRatio
  style?: IllustrationStyle
  inputMode?: IllustrationInputMode
  visualConsistency?: boolean
  paletteColors?: string[]
  imageSize?: ImageOutputSize
  offering?: ImageOfferingId
  sourceImage?: SourceImage
  referenceImage?: SourceImage
  tabularData?: string
  purpose?: "illustration" | "plot"
  seed?: string
}

export type ModelProviderId = "fixture" | "gemini"

export interface ModelProvider {
  readonly id: ModelProviderId
  planFigure(input: PlanInput, signal: AbortSignal): Promise<FigurePlan>
  createFlowchart(input: GenerateFlowchartInput, signal: AbortSignal): Promise<UnknownJson>
  reviseFlowchart(input: ReviseFlowchartInput, signal: AbortSignal): Promise<UnknownJson>
  createIllustration(input: GenerateImageInput, signal: AbortSignal): Promise<GeneratedImage>
  reviseIllustration(input: GenerateImageInput, signal: AbortSignal): Promise<GeneratedImage>
  createPlot(input: GenerateImageInput, signal: AbortSignal): Promise<GeneratedImage>
}

export type { ImageAspectRatio } from "./contracts"
