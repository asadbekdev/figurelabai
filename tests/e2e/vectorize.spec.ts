import { expect, test } from "@playwright/test"
import sharp from "sharp"

async function fixturePng(): Promise<Buffer> {
  const svg = `<svg width="240" height="160" xmlns="http://www.w3.org/2000/svg">
    <rect width="240" height="160" fill="white"/>
    <circle cx="70" cy="80" r="44" fill="black"/>
    <rect x="140" y="40" width="70" height="80" fill="black"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

test("POST /api/vectorize traces a PNG and the canvas shows the HEX inspector", async ({
  page,
  request,
}) => {
  const png = await fixturePng()
  const response = await request.post("/api/vectorize", {
    data: {
      image: { mimeType: "image/png", data: png.toString("base64") },
      detail: "balanced",
    },
  })
  expect(response.status(), await response.text()).toBe(200)
  const body = (await response.json()) as {
    ok: boolean
    data?: { svg: string; pathCount: number; width: number; height: number }
  }
  expect(body.ok).toBe(true)
  expect(body.data?.pathCount).toBeGreaterThanOrEqual(1)
  expect(body.data?.svg).toContain("<path")

  await page.goto("/vector-canvas")
  await expect(page.getByRole("heading", { name: "Vector canvas", exact: true })).toBeVisible()
  await expect(page.getByLabel("Upload a PNG, JPEG, WebP, or SVG")).toHaveCount(1)
  await expect(page.getByRole("link", { name: "Browse projects" })).toBeVisible()
  await expect(page.getByLabel("Search vector canvases")).toHaveCount(0)
  await page.getByLabel("Upload a PNG, JPEG, WebP, or SVG").setInputFiles({
    name: "high-contrast.png",
    mimeType: "image/png",
    buffer: png,
  })

  await expect(page).toHaveURL(/\/vector-canvas\/[0-9a-f-]{36}/i, { timeout: 30_000 })
  const documentId = page.url().split("/vector-canvas/")[1]
  expect(documentId).toMatch(/^[0-9a-f-]{36}$/i)

  const zoom = page.getByRole("button", { name: "Reset zoom and canvas position" })
  await expect(zoom).toHaveText("100%")
  await page.getByRole("button", { name: "Zoom in" }).click()
  await expect(zoom).toHaveText("110%")

  await page.getByRole("button", { name: /Path 1/ }).click()
  await expect(page.getByLabel("Fill HEX")).toBeVisible()
})
