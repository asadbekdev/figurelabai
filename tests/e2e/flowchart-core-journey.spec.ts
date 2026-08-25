import { readFile } from "node:fs/promises"

import { expect, test } from "@playwright/test"
import { XMLValidator } from "fast-xml-parser"
import sharp from "sharp"

test("prompt to plan to editable export survives direct reopen", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await page.goto("/")
  await page
    .getByRole("textbox", { name: "Describe a process, pathway, or logic" })
    .fill("Collect sample, extract DNA, amplify target, and analyze the result")
  await page.getByRole("button", { name: "Send" }).click()

  await expect(page.getByRole("heading", { name: "Review the generation plan" })).toBeVisible()
  await page.getByLabel("Title").fill("Validated PCR workflow")
  await page.getByLabel("Section 1 label").fill("Collect and barcode sample")
  await page.getByLabel("Assumption 1").fill("Use the deterministic fixture for release QA.")
  await page.getByRole("button", { name: "Approve and generate" }).click()

  await expect(page).toHaveURL(/\/project\/[0-9a-f-]{36}$/i, { timeout: 30_000 })
  const projectUrl = page.url()
  await expect(page.getByRole("button", { name: "Add node" })).toBeVisible()

  await page.locator('.react-flow__node[data-id="start"]').click()
  await page.getByLabel("Label").fill("Prepared sample")
  await page.getByLabel("Label").press("Tab")
  await expect(page.getByRole("status", { name: "Project save status" })).toContainText(
    "Saved",
    { timeout: 10_000 }
  )

  await page.getByRole("textbox", { name: "Request a change" }).fill(
    "Add a quality-control note after amplification"
  )
  await page.getByRole("button", { name: "Request change" }).click()
  await expect(page.getByRole("heading", { name: "Review AI patch" })).toBeVisible({
    timeout: 20_000,
  })
  await page.getByRole("button", { name: "Accept patch" }).click()
  await expect(page.getByText("AI patch applied")).toBeVisible()
  await page.getByRole("button", { name: "Undo" }).click()

  await page.getByRole("tab", { name: "Objects" }).click()
  await expect(page.getByRole("button", { name: /Prepared sample.*Terminator/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /quality-control note/i })).toHaveCount(0)

  await page.getByRole("tab", { name: "Versions" }).click()
  await page.getByRole("button", { name: "Name this version" }).click()
  await page.getByLabel("Version name").fill("Release QA checkpoint")
  await page.getByRole("button", { name: "Save version" }).click()
  await expect(page.getByText("Release QA checkpoint")).toBeVisible()

  await page.getByRole("tab", { name: "Verify" }).click()
  await expect(page.getByText("No publication blockers or warnings were found.")).toBeVisible()

  await page.getByRole("button", { name: "Export figure" }).click()
  await expect(page.getByRole("dialog", { name: "Export flowchart" })).toBeVisible()
  const svgDownloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download SVG" }).click()
  const svgDownload = await svgDownloadPromise
  const svgPath = await svgDownload.path()
  if (!svgPath) throw new Error("SVG download did not produce a local artifact")
  const svg = await readFile(svgPath, "utf8")
  expect(XMLValidator.validate(svg)).toBe(true)
  expect(svg).toContain("Prepared sample")

  await page.getByLabel("PNG image").click()
  const pngDownloadPromise = page.waitForEvent("download")
  await page.getByRole("button", { name: "Download PNG" }).click()
  const pngDownload = await pngDownloadPromise
  const pngPath = await pngDownload.path()
  if (!pngPath) throw new Error("PNG download did not produce a local artifact")
  const png = await readFile(pngPath)
  const metadata = await sharp(png).metadata()
  expect(metadata.format).toBe("png")
  expect(metadata.width).toBeGreaterThan(1_000)
  expect(metadata.height).toBeGreaterThan(600)

  await page.goto(projectUrl)
  await expect(page.getByRole("button", { name: "Add node" })).toBeVisible()
  await page.getByRole("tab", { name: "Objects" }).click()
  await expect(page.getByRole("button", { name: /Prepared sample.*Terminator/ })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test("failed fixture generation retries the same durable job", async ({ page }) => {
  await page.goto("/")
  await page
    .getByRole("textbox", { name: "Describe a process, pathway, or logic" })
    .fill("Please fail the draft once, then recover this RNA workflow")
  await page.getByRole("button", { name: "Send" }).click()
  await expect(page.getByRole("heading", { name: "Review the generation plan" })).toBeVisible()

  const createdResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/generation/jobs") && response.request().method() === "POST"
  )
  await page.getByRole("button", { name: "Approve and generate" }).click()
  const createdResponse = await createdResponsePromise
  const created = (await createdResponse.json()) as { data: { job: { id: string } } }

  await expect(page.getByText("The fixture provider failed the draft on purpose.")).toBeVisible({
    timeout: 20_000,
  })
  const retryResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/retry") && response.request().method() === "POST"
  )
  await page.getByRole("button", { name: "Retry" }).click()
  const retried = (await (await retryResponsePromise).json()) as {
    data: { job: { id: string; attemptCount: number } }
  }

  expect(retried.data.job.id).toBe(created.data.job.id)
  expect(retried.data.job.attemptCount).toBe(2)
  await expect(page).toHaveURL(/\/project\/[0-9a-f-]{36}$/i, { timeout: 30_000 })
})

test("storage fallback never claims local edits are saved", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    })
  })
  await page.goto("/project/demo")

  await expect(page.getByRole("status", { name: "Project save status" })).toContainText(
    "Storage unavailable"
  )
  await page.locator('.react-flow__node[data-id="sample"]').click()
  await page.getByLabel("Label").fill("Unsaved local edit")
  await page.getByLabel("Label").press("Tab")
  await expect(page.getByRole("status", { name: "Project save status" })).toContainText(
    "Storage unavailable"
  )
  await expect(page.getByRole("status", { name: "Project save status" })).not.toContainText(
    /Saved ·/
  )
})
