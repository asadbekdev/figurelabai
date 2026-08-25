import sharp from "sharp"
import { describe, expect, it } from "vitest"

import { createImagePptx, PPTX_MIME } from "@/lib/export/pptx"

async function fixturePngBytes(): Promise<Uint8Array> {
  const svg = `<svg width="320" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="200" fill="white"/>
    <circle cx="160" cy="100" r="60" fill="black"/>
  </svg>`
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer()
  return new Uint8Array(buffer)
}

describe("createImagePptx", () => {
  it("embeds a PNG into a one-slide PowerPoint file", async () => {
    const bytes = await fixturePngBytes()
    const blob = await createImagePptx({
      bytes,
      mimeType: "image/png",
      width: 320,
      height: 200,
      title: "Test figure",
    })

    expect(blob.type).toBe(PPTX_MIME)
    expect(blob.size).toBeGreaterThan(1_000)

    const header = new Uint8Array(await blob.arrayBuffer())
    expect(String.fromCharCode(header[0], header[1])).toBe("PK")
  })

  it("rejects a non-positive slide size", async () => {
    const bytes = await fixturePngBytes()
    await expect(
      createImagePptx({ bytes, mimeType: "image/png", width: 0, height: 200 })
    ).rejects.toThrow("positive")
  })
})
