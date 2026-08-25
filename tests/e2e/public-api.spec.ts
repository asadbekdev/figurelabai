import { expect, test } from "@playwright/test"

test("local API page documents how to call POST /api/v1/figures", async ({ page }) => {
  await page.goto("/api")
  await expect(page.getByRole("heading", { name: "Local API", exact: true })).toBeVisible()
  await expect(page.getByText("POST /api/v1/figures")).toBeVisible()
  await expect(page.getByText(/nano-banana \(Gemini 2.5 Flash Image\)/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Copy create example" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Copy poll example" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Local API" })).toBeVisible()
})

test("POST /api/v1/figures with Fixture returns a pollable illustration", async ({ request }) => {
  const created = await request.post("/api/v1/figures", {
    data: {
      prompt: "Draw a labeled three-step PCR workflow.",
      mode: "illustration",
      offering: "fixture",
    },
  })
  expect(created.ok()).toBeTruthy()
  const body = (await created.json()) as {
    ok: boolean
    data: { figure: { id: string; pollUrl: string; status: string } }
  }
  expect(body.ok).toBe(true)
  expect(body.data.figure.pollUrl).toBe(`/api/v1/figures/${body.data.figure.id}`)

  const started = Date.now()
  while (Date.now() - started < 20_000) {
    const polled = await request.get(body.data.figure.pollUrl)
    expect(polled.ok()).toBeTruthy()
    const snapshot = (await polled.json()) as {
      ok: boolean
      data: {
        figure: {
          status: string
          result: { kind: string; dataUrl?: string } | null
        }
      }
    }
    if (snapshot.data.figure.status === "succeeded") {
      expect(snapshot.data.figure.result?.kind).toBe("image")
      expect(snapshot.data.figure.result?.dataUrl?.length).toBeGreaterThan(32)
      return
    }
    if (snapshot.data.figure.status === "failed" || snapshot.data.figure.status === "canceled") {
      throw new Error(`Figure job ended as ${snapshot.data.figure.status}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error("Timed out polling the public figure job")
})
