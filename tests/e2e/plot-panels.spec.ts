import { expect, test } from "@playwright/test"

test("two-panel plot template renders both charts and can stack", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => {
    pageErrors.push(error.message)
  })

  await page.goto("/templates")
  await expect(page.getByRole("heading", { name: "Bars and line together" })).toBeVisible()
  await page
    .locator("article")
    .filter({ hasText: "Bars and line together" })
    .getByRole("button", { name: "Use Bars and line together template", exact: true })
    .click()

  await expect(page).toHaveURL(/\/project\/[0-9a-f-]{36}/i, { timeout: 20_000 })
  await expect(page.getByLabel("Second panel")).toBeVisible()
  await expect(page.locator('svg[data-panel="A"]')).toBeVisible()
  await expect(page.locator('svg[data-panel="B"]')).toBeVisible()
  await expect(page.getByRole("radio", { name: "Side by side" })).toBeChecked()

  await page.getByLabel("Layout").getByRole("radio", { name: "One above the other" }).click()
  await expect(page.getByLabel("Layout").getByRole("radio", { name: "One above the other" })).toBeChecked()
  await expect(page.locator('svg[data-panel="A"]')).toBeVisible()
  await expect(page.locator('svg[data-panel="B"]')).toBeVisible()
  expect(pageErrors).toEqual([])
})
