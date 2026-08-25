import { defineConfig, devices } from "@playwright/test"
import { tmpdir } from "node:os"
import { join } from "node:path"

const externalBaseURL = process.env.FIGURELAB_PLAYWRIGHT_BASE_URL
const baseURL = externalBaseURL ?? "http://127.0.0.1:3111"
const jobStorePath = join(tmpdir(), `figurelab-playwright-jobs-${process.pid}.json`)

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    trace: "off",
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3111",
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          MODEL_PROVIDER: "fixture",
          FIXTURE_STAGE_DELAY_MS: "10",
          FIGURELAB_JOB_STORE_PATH: jobStorePath,
        },
      },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: /flowchart-mobile\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chromium",
      testMatch: /flowchart-mobile\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
})
