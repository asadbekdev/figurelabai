import { expect, test } from "@playwright/test"

test("390px plan keeps approval after every editable field", async ({ page }) => {
  await page.goto("/")
  await page
    .getByRole("textbox", { name: "Describe a process, pathway, or logic" })
    .fill("Collect blood, isolate plasma, run biomarker assay, and review the result")
  await page.getByRole("button", { name: "Send" }).click()

  const approval = page.getByRole("button", { name: "Approve and generate" })
  const lastAssumption = page.getByLabel("Assumption 1")
  await expect(approval).toBeVisible()
  await expect(lastAssumption).toBeVisible()

  const approvalBox = await approval.boundingBox()
  const assumptionBox = await lastAssumption.boundingBox()
  expect(approvalBox).not.toBeNull()
  expect(assumptionBox).not.toBeNull()
  expect(approvalBox!.y).toBeGreaterThanOrEqual(assumptionBox!.y + assumptionBox!.height)
})

test("390px editor keeps navigation, inspector, readiness, and export reachable", async ({ page }) => {
  await page.goto("/project/demo")
  await expect(page.getByRole("button", { name: "Add node" })).toBeVisible()

  const overflow = await page.evaluate(() => ({
    body: document.body.scrollWidth - document.body.clientWidth,
    root: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }))
  expect(overflow.body).toBeLessThanOrEqual(1)
  expect(overflow.root).toBeLessThanOrEqual(1)

  await page.getByRole("button", { name: "Open sidebar" }).click()
  await expect(page.getByRole("dialog", { name: "FigureLab" })).toBeVisible()
  await page.getByRole("button", { name: "Close navigation" }).click()

  await page.getByRole("button", { name: "Open inspector" }).click()
  const details = page.getByRole("dialog", { name: "Figure details" })
  await expect(details).toBeVisible()
  for (const tab of ["Objects", "Verify", "Versions", "Inspector"]) {
    await details.getByRole("tab", { name: tab }).click()
    await expect(details.getByRole("tab", { name: tab })).toHaveAttribute("data-state", "active")
  }
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "More figure actions" }).click()
  await expect(page.getByRole("dialog", { name: "Figure actions" })).toBeVisible()
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: "Export figure" }).click()
  const exportDialog = page.getByRole("dialog", { name: "Export flowchart" })
  await expect(exportDialog).toBeVisible()
  await expect(exportDialog.getByRole("button", { name: "Download SVG" })).toBeVisible()
})
