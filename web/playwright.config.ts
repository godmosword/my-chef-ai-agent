import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm run build:e2e && pnpm exec next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "test_key",
      NEXT_PUBLIC_SHARING_ENABLED: "1",
      NEXT_PUBLIC_COOKING_MODE_ENABLED: "1",
      NEXT_PUBLIC_NEW_UI: "1",
    },
  },
});
