import { expect, test } from "@playwright/test"

test("grouping selected nodes does not crash and survives reload", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => {
    pageErrors.push(error.message)
  })

  await page.goto("/project/demo")
  await expect(page.getByRole("button", { name: "Group selected nodes", exact: true })).toBeVisible()
  await expect(page.getByText("Unable to load project")).toHaveCount(0)

  await page.locator('.react-flow__node[data-id="sample"]').click()
  await page.locator('.react-flow__node[data-id="extract"]').click({ modifiers: ["Shift"] })
  expect(pageErrors).toEqual([])
  await expect(page.getByText("Unable to load project")).toHaveCount(0)

  await expect(page.getByRole("button", { name: "Group selected nodes", exact: true })).toBeEnabled()
  await page.getByRole("button", { name: "Group selected nodes", exact: true }).click()

  await expect(page.getByText("Unable to load project")).toHaveCount(0)
  expect(pageErrors.filter((message) => message.includes("Maximum update depth"))).toEqual([])
  expect(pageErrors).toEqual([])
  await expect(page.getByRole("button", { name: "Ungroup selected nodes", exact: true })).toBeEnabled()

  await page.getByRole("tab", { name: "Objects" }).click()
  await expect(page.getByRole("button", { name: "Group Group" })).toBeVisible()

  await expect(page.getByText(/Saved ·/)).toBeVisible({ timeout: 10_000 })

  await page.reload()
  await expect(page.getByRole("button", { name: "Group selected nodes", exact: true })).toBeVisible()
  await expect(page.getByText("Unable to load project")).toHaveCount(0)
  expect(pageErrors.filter((message) => message.includes("Maximum update depth"))).toEqual([])

  await page.getByRole("tab", { name: "Objects" }).click()
  await expect(page.getByRole("button", { name: "Group Group" })).toBeVisible()
  await page.getByRole("button", { name: "Group Group" }).click()
  await expect(page.getByRole("button", { name: "Ungroup selected nodes", exact: true })).toBeEnabled()
})
