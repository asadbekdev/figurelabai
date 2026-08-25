export const MAX_TEXT_ATTACHMENT_CHARS = 80_000
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

export type AttachmentKind = "text" | "image" | "csv"

export type ParsedAttachment = {
  name: string
  kind: AttachmentKind
  mimeType: string
  size: number
  text?: string
  dataUrl?: string
}

export type AttachmentError = {
  code: "unsupported" | "empty" | "too_large" | "unreadable"
  message: string
}

const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown"])
const DOCUMENT_EXTENSIONS = new Set(["pdf", "docx"])
const CSV_EXTENSIONS = new Set(["csv", "tsv", "xlsx"])
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"])

const TEXT_MIME = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
])
const DOCUMENT_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])
const CSV_MIME = new Set([
  "text/csv",
  "text/tab-separated-values",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])
const IMAGE_MIME = new Set(["image/png", "image/jpeg", "image/webp"])

export const ATTACH_ACCEPT =
  ".txt,.md,.markdown,.pdf,.docx,.csv,.tsv,.xlsx,.png,.jpg,.jpeg,.webp,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,image/webp"

export const ATTACH_IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
export const ATTACH_DOC_ACCEPT =
  ".txt,.md,.markdown,.pdf,.docx,.csv,.tsv,.xlsx,text/plain,text/markdown,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

function extensionOf(name: string): string {
  const trimmed = name.trim()
  const index = trimmed.lastIndexOf(".")
  if (index < 0) return ""
  return trimmed.slice(index + 1).toLowerCase()
}

export function classifyAttachment(
  file: Pick<File, "name" | "type" | "size">
): AttachmentKind | null {
  const extension = extensionOf(file.name)
  const mime = file.type.toLowerCase()

  if (TEXT_EXTENSIONS.has(extension) || TEXT_MIME.has(mime)) return "text"
  if (DOCUMENT_EXTENSIONS.has(extension) || DOCUMENT_MIME.has(mime)) return "text"
  if (CSV_EXTENSIONS.has(extension) || CSV_MIME.has(mime)) return "csv"
  if (IMAGE_EXTENSIONS.has(extension) || IMAGE_MIME.has(mime)) return "image"
  return null
}

export function attachmentErrorMessage(code: AttachmentError["code"], name?: string): string {
  if (code === "unsupported") {
    return name
      ? `${name} is not supported. Attach .txt, .md, .pdf, .docx, .csv, .xlsx, PNG, JPEG, or WebP.`
      : "That file type is not supported. Attach .txt, .md, .pdf, .docx, .csv, .xlsx, PNG, JPEG, or WebP."
  }
  if (code === "empty") {
    return name ? `${name} is empty.` : "The attached file is empty."
  }
  if (code === "too_large") {
    return name
      ? `${name} is larger than 8 MB.`
      : "The attached file is larger than 8 MB."
  }
  return name ? `${name} could not be read.` : "The attached file could not be read."
}

function readAsText(file: File): Promise<string> {
  return file.text()
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("unreadable"))
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("unreadable"))
    }
    reader.readAsDataURL(file)
  })
}

export async function parseAttachment(
  file: File
): Promise<{ ok: true; attachment: ParsedAttachment } | { ok: false; error: AttachmentError }> {
  const kind = classifyAttachment(file)
  if (!kind) {
    return {
      ok: false,
      error: { code: "unsupported", message: attachmentErrorMessage("unsupported", file.name) },
    }
  }
  if (file.size <= 0) {
    return {
      ok: false,
      error: { code: "empty", message: attachmentErrorMessage("empty", file.name) },
    }
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: { code: "too_large", message: attachmentErrorMessage("too_large", file.name) },
    }
  }

  try {
    if (kind === "csv" && (extensionOf(file.name) === "xlsx" || file.type.includes("spreadsheetml"))) {
      const { parseXlsxFile } = await import("@/lib/plot/xlsx")
      const { tableToCsv: toCsv } = await import("@/lib/plot/parse")
      const table = await parseXlsxFile(file)
      if (!table) {
        return {
          ok: false,
          error: { code: "unreadable", message: attachmentErrorMessage("unreadable", file.name) },
        }
      }
      const text = toCsv(table.columns, table.rows)
      return {
        ok: true,
        attachment: {
          name: file.name,
          kind: "csv",
          mimeType: "text/csv",
          size: file.size,
          text: text.slice(0, MAX_TEXT_ATTACHMENT_CHARS),
        },
      }
    }

    const extension = extensionOf(file.name)
    if (
      kind === "text" &&
      (DOCUMENT_EXTENSIONS.has(extension) || DOCUMENT_MIME.has(file.type.toLowerCase()))
    ) {
      const { extractDocumentText } = await import("./document-text")
      const text = await extractDocumentText(await file.arrayBuffer(), file.name)
      if (!text) {
        return {
          ok: false,
          error: {
            code: "unreadable",
            message: `${file.name} has no extractable text. Export it as TXT, or attach notes. Scanned pages are not read.`,
          },
        }
      }
      return {
        ok: true,
        attachment: {
          name: file.name,
          kind: "text",
          mimeType: file.type || (extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
          size: file.size,
          text: text.slice(0, MAX_TEXT_ATTACHMENT_CHARS),
        },
      }
    }

    if (kind === "image") {
      const dataUrl = await readAsDataUrl(file)
      if (!dataUrl.startsWith("data:image/")) {
        return {
          ok: false,
          error: { code: "unreadable", message: attachmentErrorMessage("unreadable", file.name) },
        }
      }
      return {
        ok: true,
        attachment: {
          name: file.name,
          kind,
          mimeType: file.type || "image/png",
          size: file.size,
          dataUrl,
        },
      }
    }

    const raw = await readAsText(file)
    const text = raw.replace(/^\uFEFF/, "").trim()
    if (!text) {
      return {
        ok: false,
        error: { code: "empty", message: attachmentErrorMessage("empty", file.name) },
      }
    }

    return {
      ok: true,
      attachment: {
        name: file.name,
        kind,
        mimeType: file.type || (kind === "csv" ? "text/csv" : "text/plain"),
        size: file.size,
        text: text.slice(0, MAX_TEXT_ATTACHMENT_CHARS),
      },
    }
  } catch {
    return {
      ok: false,
      error: { code: "unreadable", message: attachmentErrorMessage("unreadable", file.name) },
    }
  }
}

export function defaultPromptForAttachment(
  mode: "flowchart" | "illustration" | "plot" | "ask",
  attachment: ParsedAttachment
): string {
  if (attachment.kind === "image") {
    if (mode === "illustration") return "Create a clean scientific figure from this image."
    if (mode === "plot") return "Turn the data or chart in this image into a publication-style figure."
    return "Turn this image into an editable flowchart."
  }
  if (attachment.kind === "csv") {
    return "Create a publication-style chart from this table."
  }
  if (mode === "illustration") return "Create a scientific illustration from the attached notes."
  return "Create a flowchart from the attached notes."
}

export function composePromptWithSource(prompt: string, attachment: ParsedAttachment | null): string {
  const trimmed = prompt.trim()
  if (!attachment) return trimmed
  if (attachment.kind === "image") return trimmed
  const body = attachment.text?.trim()
  if (!body) return trimmed
  const header = `Attached ${attachment.kind === "csv" ? "table" : "notes"} (${attachment.name}):`
  if (!trimmed) return `${header}\n\n${body}`
  return `${trimmed}\n\n${header}\n\n${body}`
}

export function dataUrlToInline(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(dataUrl)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("The image could not be encoded."))
    }
    reader.onerror = () => reject(new Error("The image could not be read."))
    reader.readAsDataURL(blob)
  })
}

export async function blobToSourceImage(blob: Blob): Promise<{
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml"
  data: string
}> {
  const dataUrl = await blobToDataUrl(blob)
  const inline = dataUrlToInline(dataUrl)
  if (!inline) throw new Error("The image could not be encoded.")
  if (
    inline.mimeType !== "image/png" &&
    inline.mimeType !== "image/jpeg" &&
    inline.mimeType !== "image/webp" &&
    inline.mimeType !== "image/svg+xml"
  ) {
    throw new Error("That image type is not supported for generation.")
  }
  return { mimeType: inline.mimeType, data: inline.data }
}
