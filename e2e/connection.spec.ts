import { expect, test } from "@playwright/test";

/**
 * Integration: a real Node `ws` server (see playwright.config webServer) sends RoomInfo.
 * This exercises the browser WebSocket API end-to-end — not Playwright `routeWebSocket` mocks.
 */
test.describe("connection", () => {
  test("shows host, port, and connect on load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Archipelago Tracker" })).toBeVisible();
    await expect(page.getByLabel("Host")).toBeVisible();
    await expect(page.getByLabel("Port")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
  });

  test("requires host and port", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Host").fill("");
    await page.getByLabel("Port").fill("");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByText("Host is required.")).toBeVisible();
    await expect(page.getByText("Port is required.")).toBeVisible();
  });

  test("connects over real WebSocket to local server and shows RoomInfo", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Port").fill("53087");
    await page.getByRole("button", { name: "Connect" }).click();

    await expect(page.getByRole("heading", { name: "Room info", level: 2 })).toBeVisible();
    await expect(page.getByText("Seed: integration-ws-seed")).toBeVisible();
    await expect(page.getByText("Pick Me Game")).toBeVisible();
  });

  test("registers slot with Connect and shows Connected snackbar", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Port").fill("53087");
    await page.getByRole("button", { name: "Connect" }).click();

    await page.getByRole("button", { name: "Pick Me Game" }).click();
    await page.getByLabel("Slot name").fill("E2EPlayer");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Connected as E2EPlayer.")).toBeVisible();
  });

  /** No server on this port — expect refused / error quickly (not the integration server). */
  test("shows error when connection fails", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Port").fill("65431");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("alert")).toContainText("Could not connect.");
  });
});
