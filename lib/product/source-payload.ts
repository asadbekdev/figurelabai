import type { SourceImage, SourceText } from "@/lib/generation/contracts"
import {
  composePromptWithSource,
  dataUrlToInline,
  type ParsedAttachment,
} from "@/lib/product/attachments"

export type SourcePayload = {
  prompt: string
  sourceText?: SourceText
  sourceImage?: SourceImage
  tabularData?: string
}

export function sourcePayloadFromAttachment(
  prompt: string,
  attachment: ParsedAttachment | null
): SourcePayload {
  if (!attachment) {
    return { prompt: prompt.trim() }
  }

  if (attachment.kind === "image" && attachment.dataUrl) {
    const inline = dataUrlToInline(attachment.dataUrl)
    return {
      prompt: prompt.trim(),
      sourceImage: inline
        ? {
            mimeType: inline.mimeType as SourceImage["mimeType"],
            data: inline.data,
            name: attachment.name,
          }
        : undefined,
    }
  }

  if (attachment.kind === "csv" && attachment.text) {
    return {
      prompt: prompt.trim(),
      sourceText: { name: attachment.name, text: attachment.text },
      tabularData: attachment.text,
    }
  }

  if (attachment.text) {
    return {
      prompt: composePromptWithSource(prompt, attachment),
      sourceText: { name: attachment.name, text: attachment.text },
    }
  }

  return { prompt: prompt.trim() }
}

export function userMessageForPrompt(prompt: string, attachment: ParsedAttachment | null): string {
  if (!attachment) return prompt
  if (attachment.kind === "image") {
    return `${prompt}\n\nAttached image: ${attachment.name}`
  }
  return `${prompt}\n\nAttached ${attachment.kind === "csv" ? "table" : "notes"}: ${attachment.name}`
}

/**
 * Builds the generation payload from the composer's attachment set: at most one
 * reference image plus one document (notes or CSV), and an optional pasted table.
 * Pasted plot data wins over an attached CSV for the tabular slot.
 */
export function sourcePayloadFromAttachments(
  prompt: string,
  attachments: ParsedAttachment[],
  plotData?: string
): SourcePayload {
  const image = attachments.find((attachment) => attachment.kind === "image")
  const docs = attachments.filter((attachment) => attachment.kind !== "image")
  const csv = docs.find((attachment) => attachment.kind === "csv")
  const notes = docs.find((attachment) => attachment.kind === "text")

  let nextPrompt = prompt.trim()
  if (notes) nextPrompt = composePromptWithSource(nextPrompt, notes)

  const payload: SourcePayload = { prompt: nextPrompt }

  if (image?.dataUrl) {
    const inline = dataUrlToInline(image.dataUrl)
    if (inline) {
      payload.sourceImage = {
        mimeType: inline.mimeType as SourceImage["mimeType"],
        data: inline.data,
        name: image.name,
      }
    }
  }

  const docForContext = csv ?? notes
  if (docForContext?.text) {
    payload.sourceText = { name: docForContext.name, text: docForContext.text }
  }

  const pasted = plotData?.trim()
  if (pasted) {
    payload.tabularData = pasted
  } else if (csv?.text) {
    payload.tabularData = csv.text
  }

  return payload
}

export function userMessageForAttachments(
  prompt: string,
  attachments: ParsedAttachment[],
  plotData?: string
): string {
  const lines = attachments.map((attachment) => {
    if (attachment.kind === "image") return `Reference image: ${attachment.name}`
    return `Attached ${attachment.kind === "csv" ? "table" : "notes"}: ${attachment.name}`
  })
  if (plotData?.trim()) lines.push("Pasted table data")
  return [prompt, ...lines].filter(Boolean).join("\n\n")
}
