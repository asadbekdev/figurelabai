import { createStoredZip, readZipEntries } from "@/lib/plot/xlsx"

const PDF_MAX_CHARS = 80_000

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
}

async function inflateZlib(data: Uint8Array): Promise<Uint8Array> {
  const nodeZlib = (
    globalThis as { process?: { versions?: { node?: string } } }
  ).process?.versions?.node
    ? await import("node:zlib")
    : null
  if (nodeZlib) {
    try {
      return nodeZlib.inflateSync(data)
    } catch {
      return nodeZlib.inflateRawSync(data)
    }
  }

  for (const format of ["deflate", "deflate-raw"] as const) {
    try {
      const stream = new DecompressionStream(format)
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()
      await writer.write(Uint8Array.from(data))
      await writer.close()
      const chunks: Uint8Array[] = []
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
      const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const out = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        out.set(chunk, offset)
        offset += chunk.length
      }
      return out
    } catch {
      // Try the next wrapper format.
    }
  }
  throw new Error("deflate")
}

function decodePdfLiteral(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8))
    )
}

function extractPdfStrings(source: string): string[] {
  const parts: string[] = []
  const tj = /\((?:\\.|[^\\)])*\)\s*Tj/g
  let match: RegExpExecArray | null
  while ((match = tj.exec(source))) {
    const inner = match[0].slice(1, match[0].lastIndexOf(")"))
    const text = decodePdfLiteral(inner).trim()
    if (text) parts.push(text)
  }

  const arrays = /\[([\s\S]*?)\]\s*TJ/g
  while ((match = arrays.exec(source))) {
    const body = match[1] ?? ""
    const literals = body.match(/\((?:\\.|[^\\)])*\)/g) ?? []
    const joined = literals
      .map((literal) => decodePdfLiteral(literal.slice(1, -1)))
      .join("")
      .trim()
    if (joined) parts.push(joined)
  }

  return parts
}

export async function extractPdfText(buffer: ArrayBuffer): Promise<string | null> {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 8) return null
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 8))
  if (!header.startsWith("%PDF")) return null

  const latin1 = new TextDecoder("latin1").decode(bytes)
  const parts: string[] = []
  const streamPattern = /stream\r?\n([\s\S]*?)endstream/g
  let match: RegExpExecArray | null

  while ((match = streamPattern.exec(latin1))) {
    const streamStart = match.index
    const dictStart = latin1.lastIndexOf("<<", streamStart)
    const dict = dictStart >= 0 ? latin1.slice(dictStart, streamStart) : ""
    const payload = match[1] ?? ""
    const raw = new Uint8Array(payload.length)
    for (let index = 0; index < payload.length; index += 1) {
      raw[index] = payload.charCodeAt(index) & 0xff
    }

    let content = payload
    if (/\/FlateDecode/.test(dict)) {
      try {
        content = new TextDecoder("latin1").decode(await inflateZlib(raw))
      } catch {
        continue
      }
    }
    parts.push(...extractPdfStrings(content))
  }

  if (parts.length === 0) {
    parts.push(...extractPdfStrings(latin1))
  }

  const text = parts.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  if (!text) return null
  return text.slice(0, PDF_MAX_CHARS)
}

export async function extractDocxText(buffer: ArrayBuffer): Promise<string | null> {
  const entries = await readZipEntries(new Uint8Array(buffer))
  const document = entries.find((entry) => entry.name === "word/document.xml")
  if (!document) return null
  const xml = new TextDecoder("utf-8").decode(document.data)
  const paragraphs = xml.split(/<\/w:p>/i)
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    const runs = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/gi)]
    const line = runs.map((run) => decodeXml(run[1] ?? "")).join("").trim()
    if (line) lines.push(line)
  }
  const text = lines.join("\n").trim()
  if (!text) return null
  return text.slice(0, PDF_MAX_CHARS)
}

export async function extractDocumentText(
  buffer: ArrayBuffer,
  name: string
): Promise<string | null> {
  const extension = name.trim().slice(name.lastIndexOf(".") + 1).toLowerCase()
  if (extension === "pdf") return extractPdfText(buffer)
  if (extension === "docx") return extractDocxText(buffer)
  return null
}

export function createMinimalDocx(paragraphs: string[]): Uint8Array {
  const body = paragraphs
    .map(
      (paragraph) =>
        `<w:p><w:r><w:t>${paragraph
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")}</w:t></w:r></w:p>`
    )
    .join("")
  return createStoredZip([
    {
      name: "word/document.xml",
      body: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
    },
  ])
}

export function createUncompressedPdf(text: string): Uint8Array {
  const safe = text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")
  const stream = `BT /F1 12 Tf 72 720 Td (${safe}) Tj ET`
  const source = `%PDF-1.1
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length ${stream.length} >> stream
${stream}
endstream
endobj
trailer << /Root 1 0 R >>
%%EOF
`
  return new TextEncoder().encode(source)
}
