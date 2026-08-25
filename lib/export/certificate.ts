import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export type PublicationRecordInput = {
  title: string
  projectId: string
  figureKind: "flowchart" | "illustration"
  issuedAt?: Date
}

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const INK = rgb(0.05, 0.05, 0.05)
const MUTED = rgb(0.36, 0.36, 0.36)
const RULE = rgb(0.12, 0.12, 0.12)

function wrapText(text: string, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : [""]
}

export async function createPublicationRecordPdf(
  input: PublicationRecordInput
): Promise<Blob> {
  const issuedAt = input.issuedAt ?? new Date()
  const title = input.title.trim().slice(0, 300) || "Untitled figure"
  const projectId = input.projectId.trim().slice(0, 80) || "local-unsaved"
  const kindLabel = input.figureKind === "flowchart" ? "Flowchart" : "Illustration"
  const dateLabel = issuedAt.toISOString()

  const document = await PDFDocument.create()
  document.setTitle(`Local figure record — ${title}`)
  document.setSubject("Local project record, not a legal license")
  document.setKeywords([projectId, dateLabel, kindLabel, title])
  document.setProducer("FigureLab")
  document.setCreator("FigureLab")

  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])

  const left = 72
  const right = PAGE_WIDTH - 72
  const width = right - left
  let y = PAGE_HEIGHT - 88

  page.drawRectangle({
    x: 48,
    y: 48,
    width: PAGE_WIDTH - 96,
    height: PAGE_HEIGHT - 96,
    borderColor: RULE,
    borderWidth: 1,
  })

  page.drawText("FigureLab", {
    x: left,
    y,
    size: 11,
    font: regular,
    color: MUTED,
  })
  y -= 28

  page.drawText("Local figure record", {
    x: left,
    y,
    size: 22,
    font: bold,
    color: INK,
  })
  y -= 22

  const disclaimer =
    "This is not a legal license, journal approval, copyright assignment, or independently verifiable certificate. It only records that a figure with this title existed in a local FigureLab project on this device."
  for (const line of wrapText(disclaimer, regular, 10, width)) {
    page.drawText(line, { x: left, y, size: 10, font: regular, color: MUTED })
    y -= 14
  }

  y -= 18
  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1,
    color: RULE,
  })
  y -= 28

  const fields: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "Figure title", value: title },
    { label: "Date", value: dateLabel },
    { label: "Local project id", value: projectId, mono: true },
    { label: "Figure kind", value: kindLabel },
  ]

  for (const field of fields) {
    page.drawText(field.label, {
      x: left,
      y,
      size: 10,
      font: regular,
      color: MUTED,
    })
    y -= 16
    const valueFont = field.mono ? regular : bold
    const size = field.mono ? 11 : 13
    for (const line of wrapText(field.value, valueFont, size, width)) {
      page.drawText(line, { x: left, y, size, font: valueFont, color: INK })
      y -= size + 4
    }
    y -= 12
  }

  y -= 8
  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1,
    color: RULE,
  })
  y -= 24

  const footer =
    "No paid plan, verification service, or rights grant is attached. Keep this file with the exported figure if you need a dated local record."
  for (const line of wrapText(footer, regular, 10, width)) {
    page.drawText(line, { x: left, y, size: 10, font: regular, color: MUTED })
    y -= 14
  }

  const bytes = await document.save()
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" })
}
