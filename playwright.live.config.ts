/**
 * Live deployment E2E: targets a real app URL (no local Vite, no fixture WebSocket server).
 *
 * Requires PLAYWRIGHT_BASE_URL (e.g. https://your-app.example or a preview URL).
 *
 * Example:
 *   PLAYWRIGHT_BASE_URL=https://example.com npm run test:e2e:live
 *
 * Room WebSocket only (stops at game selection):
 *   E2E_ARCHIPELAGO_HOST=archipelago.gg E2E_ARCHIPELAGO_PORT=38281 npm run test:e2e:live
 *
 * Sign-in (Connect packet + tracker shell) — add game name and slot name (exact game string from room):
 *   E2E_ARCHIPELAGO_GAME="Super Metroid" E2E_SLOT_NAME=Player1 npm run test:e2e:live
 * Optional slot password: E2E_SLOT_PASSWORD=...
 *
 * Live tests use a real Archipelago WebSocket (set E2E_* env vars in e2e/live/site.spec.ts), not the
 * local mock server. Serve the app with PLAYWRIGHT_BASE_URL (e.g. vite preview or a deployed URL).
 *
 * Observability (this config):
 * - Terminal: list reporter prints each step as it runs.
 * - Headed browser locally (not CI); set PLAYWRIGHT_HEADLESS=1 to hide the window.
 * - Every test records trace + video under test-results/ (see HTML report).
 * - Open a trace: npx playwright show-trace test-results/.../trace.zip
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL?.trim();
if (!baseURL) {
  throw new Error(
    "PLAYWRIGHT_BASE_URL is required (deployed app origin, e.g. https://example.com). See playwright.live.config.ts.",
  );
}

const headless = Boolean(process.env.CI || process.env.PLAYWRIGHT_HEADLESS);

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/live/**/*.spec.ts",
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    headless,
    trace: "on",
    video: "on",
    screenshot: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
