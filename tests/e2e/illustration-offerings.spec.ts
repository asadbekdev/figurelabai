import { expect, test, type Page } from "@playwright/test"

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC",
  "base64"
)

async function pickFixture(page: Page) {
  await page.getByRole("button", { name: /Model:/ }).click()
  await page.getByRole("menuitemradio", { name: /Fixture/ }).click()
}

async function selectIllustrationPreview(page: Page) {
  await page.getByRole("button", { name: /Figure type:/ }).click()
  await page.getByRole("menuitemradio", { name: /Illustration.*Preview/ }).click()
}

async function expectProjectImage(page: Page) {
  await expect(page).toHaveURL(/\/project\/[0-9a-f-]{36}/i, { timeout: 45_000 })
  await expect(page.getByRole("img").first()).toBeVisible({ timeout: 20_000 })
}

test("home defaults to Flowchart and the Illustration preview remains usable", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Hello" })).toBeVisible()
  await expect(page.getByRole("button", { name: /Figure type: Flowchart/ })).toBeVisible()
  await expect(page.getByRole("button", { name: /Model:/ })).toHaveCount(0)

  await selectIllustrationPreview(page)
  await expect(page.getByRole("button", { name: /Model: Nano Banana$/ })).toBeVisible()

  await page.getByRole("button", { name: /Model:/ }).click()
  await expect(page.getByRole("menuitemradio", { name: /gemini-2\.5-flash-image/ })).toContainText(
    /Nano Banana/
  )
  await expect(page.getByRole("menuitemradio", { name: /Nano Banana Pro/ })).toContainText(
    /gemini-3-pro-image/
  )
  await expect(page.getByRole("menuitemradio", { name: /GPT Image/ })).toHaveCount(0)
  await expect(page.getByRole("menuitemradio", { name: /Flux/ })).toHaveCount(0)
  await expect(page.getByRole("menuitemradio", { name: /Fixture/ })).toContainText(/Offline/)
  await page.getByRole("menuitemradio", { name: /Fixture/ }).click()
  await page.getByRole("textbox", { name: /Describe the scientific figure/ }).fill(
    "Create a journal-style graphical abstract of a three-step PCR workflow."
  )
  await page.getByRole("button", { name: "Send" }).click()
  await expectProjectImage(page)
})

test("Image to Figure with an attached photo produces a project image", async ({ page }) => {
  await page.goto("/")
  await selectIllustrationPreview(page)
  await page.getByRole("button", { name: /Text to Figure|Image to Figure|Sketch to Figure|Enhance Figure|Add Ref Figure/ }).click()
  await page.getByRole("menuitemradio", { name: /Image to Figure/ }).click()
  await pickFixture(page)

  await page.locator('input[type="file"][accept*="image/png"]').setInputFiles({
    name: "gel.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  })
  await expect(page.getByText("gel.png")).toBeVisible()
  await page.getByRole("textbox", { name: /Describe the scientific figure/ }).fill(
    "Turn this lab photo into a clean journal figure."
  )
  await page.getByRole("button", { name: "Send" }).click()
  await expectProjectImage(page)
})

test("Generate figure image from a flowchart produces a project image", async ({ page }) => {
  await page.goto("/project/demo")
  await expect(page.getByRole("button", { name: "Generate figure image" })).toBeVisible()
  await page.getByRole("button", { name: "Generate figure image" }).click()
  await expect(page.getByRole("heading", { name: "Generate figure image" })).toBeVisible()
  await page.locator("#figure-image-offering").selectOption("fixture")
  await page.getByRole("dialog").getByRole("button", { name: "Generate figure image" }).click()
  await expectProjectImage(page)
})
