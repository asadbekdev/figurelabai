import { PDFDocument } from "pdf-lib"
import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { createPublicationRecordPdf } from "@/lib/export/certificate"
import { createImagePdf } from "@/lib/export/pdf"

async function fixturePngBytes(): Promise<Uint8Array> {
  const svg = `<svg width="320" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="200" fill="white"/>
    <circle cx="160" cy="100" r="60" fill="black"/>
  </svg>`
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
  return new Uint8Array(buffer)
}

describe("createImagePdf", () => {
  it("embeds a PNG into a one-page PDF sized to the figure", async () => {
    const bytes = await fixturePngBytes()
    const blob = await createImagePdf({
      bytes,
      mimeType: "image/png",
      width: 320,
      height: 200,
      title: "Test figure",
    })

    expect(blob.type).toBe("application/pdf")
    expect(blob.size).toBeGreaterThan(500)

    const parsed = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()))
    expect(parsed.getPageCount()).toBe(1)
    const page = parsed.getPage(0)
    expect(page.getWidth()).toBeCloseTo(240, 1)
    expect(page.getHeight()).toBeCloseTo(150, 1)
    expect(parsed.getTitle()).toBe("Test figure")
  })

  it("writes an honest local figure record with title, date, and project id", async () => {
    const issuedAt = new Date("2026-08-20T12:00:00.000Z")
    const blob = await createPublicationRecordPdf({
      title: "PCR workflow",
      projectId: "proj-local-123",
      figureKind: "flowchart",
      issuedAt,
    })
    expect(blob.type).toBe("application/pdf")
    const parsed = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()))
    expect(parsed.getPageCount()).toBe(1)
    expect(parsed.getTitle()).toContain("PCR workflow")
    expect(parsed.getSubject()).toContain("not a legal license")
    expect(parsed.getKeywords()).toContain("proj-local-123")
    expect(parsed.getKeywords()).toContain("2026-08-20T12:00:00.000Z")
    expect(parsed.getKeywords()).toContain("Flowchart")
  })

  it("rejects a non-positive page size", async () => {
    const bytes = await fixturePngBytes()
    await expect(
      createImagePdf({ bytes, mimeType: "image/png", width: 0, height: 200 })
    ).rejects.toThrow("positive")
  })
})
