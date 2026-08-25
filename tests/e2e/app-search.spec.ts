import { expect, test } from "@playwright/test"

test("global search opens repeatedly and navigates without crashing", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => {
    pageErrors.push(error.message)
  })

  await page.goto("/projects")
  const searchTrigger = page.getByRole("button", { name: "Search…" })

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await searchTrigger.click()
    await expect(page.getByRole("dialog", { name: "Search" })).toBeVisible()
    await page.getByPlaceholder("Search projects…").fill("Projects")
    await expect(page.getByRole("option", { name: "Projects" })).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog", { name: "Search" })).toBeHidden()
    await expect(searchTrigger).toBeFocused()
  }

  await searchTrigger.click()
  await page.getByPlaceholder("Search projects…").fill("Library")
  await page.getByRole("option", { name: "Library" }).click()

  await expect(page).toHaveURL(/\/library$/)
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible()
  await expect(page.getByText("Unable to load projects")).toHaveCount(0)
  expect(pageErrors).toEqual([])
})
