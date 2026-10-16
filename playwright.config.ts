import { defineConfig, devices } from "@playwright/test";

// End-to-end test of a whole class session: teacher, projector and students in real browser pages.
// Runs against `wrangler dev`, which serves the built app and the rooms like production.
//   npm run build && npm run test:e2e
// Set CHROMIUM_PATH to use a Chromium that is already installed instead of `npx playwright install chromium`.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8787",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox", "--disable-gpu", "--use-angle=swiftshader"] }
      : {},
  },
  webServer: {
    command: "npm run dev -w room -- --ip 127.0.0.1",
    url: "http://127.0.0.1:8787/network-test",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
