import { expect, test } from "@playwright/test"

test("landing page presents the Align UI flowchart story and opens the workspace", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "From research logic to an editable figure" })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Plan first", pressed: true })).toBeVisible()

  await page.getByRole("button", { name: "Verify & export" }).click()
  await expect(page.getByRole("button", { name: "Verify & export", pressed: true })).toBeVisible()

  await page.getByRole("link", { name: "Create a flowchart" }).first().click()
  await expect(page).toHaveURL(/\/create$/)
  await expect(page.getByRole("heading", { name: "Hello" })).toBeVisible()
})

test("landing page mobile navigation stays usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/")

  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(metrics.scrollWidth).toBe(metrics.clientWidth)

  await page.getByRole("button", { name: "Open menu" }).click()
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Create a flowchart" }).first()).toBeVisible()
})
