import sharp from "sharp"
import { afterEach, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/vectorize/route"
import { GenerationError } from "@/lib/generation/errors"
import { vectorizeRaster } from "@/lib/vectorize/trace"

afterEach(() => {
  vi.unstubAllEnvs()
})

async function fixturePng(): Promise<Buffer> {
  const svg = `<svg width="240" height="160" xmlns="http://www.w3.org/2000/svg">
    <rect width="240" height="160" fill="white"/>
    <circle cx="70" cy="80" r="44" fill="black"/>
    <rect x="140" y="40" width="70" height="80" fill="black"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

describe("vectorizeRaster", () => {
  it("requires the configured API key before parsing an upload", async () => {
    vi.stubEnv("FIGURELAB_API_KEY", "preview-secret")
    const denied = await POST(
      new Request("http://localhost/api/vectorize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    expect(denied.status).toBe(401)

    const authorized = await POST(
      new Request("http://localhost/api/vectorize", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": "preview-secret",
        },
        body: JSON.stringify({}),
      })
    )
    expect(authorized.status).toBe(400)
  })

  it("traces a raster PNG into SVG paths", async () => {
    const png = await fixturePng()
    const result = await vectorizeRaster({ data: png })

    expect(result.width).toBe(240)
    expect(result.height).toBe(160)
    expect(result.pathCount).toBeGreaterThanOrEqual(1)
    expect(result.svg).toContain("<svg")
    expect(result.svg).toContain("<path")
    expect(result.svg).toContain('viewBox="0 0 240 160"')
    // Two separated black shapes trace as two subpaths (two move commands).
    expect(result.svg.match(/M ?-?\d/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })

  it("applies the requested ink color to traced paths", async () => {
    const png = await fixturePng()
    const result = await vectorizeRaster({ data: png, inkColor: "#1e3a8a" })
    expect(result.svg).toContain('fill="#1e3a8a"')
  })

  it("traces a JPEG raster into SVG paths", async () => {
    const jpeg = await sharp(await fixturePng()).jpeg().toBuffer()
    const result = await vectorizeRaster({ data: jpeg })
    expect(result.pathCount).toBeGreaterThanOrEqual(1)
    expect(result.svg).toContain("<path")
  })

  it("traces a low-contrast shape after contrast and threshold", async () => {
    const svg = `<svg width="240" height="160" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="160" fill="#c8c8c8"/>
      <circle cx="70" cy="80" r="44" fill="#b0b0b0"/>
      <rect x="140" y="40" width="70" height="80" fill="#aeaeae"/>
    </svg>`
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    const withoutBoost = await vectorizeRaster({ data: png, preprocess: "none" }).catch((error) => error)
    const boosted = await vectorizeRaster({ data: png })
    expect(boosted.pathCount).toBeGreaterThanOrEqual(1)
    expect(boosted.svg).toContain("<path")
    if (withoutBoost instanceof GenerationError) {
      expect(withoutBoost.code).toMatch(/VECTORIZE_EMPTY_RESULT|VECTORIZE_FAILED/)
    }
  })

  it("rejects a flat image with an honest empty-result error", async () => {
    const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" fill="#d4d4d4"/>
    </svg>`
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    await expect(vectorizeRaster({ data: png })).rejects.toMatchObject({
      code: "VECTORIZE_EMPTY_RESULT",
    })
  })

  it("rejects an empty payload", async () => {
    await expect(vectorizeRaster({ data: Buffer.alloc(0) })).rejects.toMatchObject({
      code: "VECTORIZE_EMPTY",
    })
  })

  it("rejects undecodable input", async () => {
    await expect(
      vectorizeRaster({ data: Buffer.from("this is not an image") })
    ).rejects.toBeInstanceOf(GenerationError)
    await expect(
      vectorizeRaster({ data: Buffer.from("this is not an image") })
    ).rejects.toMatchObject({ code: "VECTORIZE_UNREADABLE" })
  })
})
