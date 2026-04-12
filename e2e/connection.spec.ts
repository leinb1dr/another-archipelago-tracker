import { expect, test } from "@playwright/test";
import { trackPageErrors } from "./fixtures/pageErrors";

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
    const assertNoPageErrors = trackPageErrors(page);
    await page.goto("/");
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Port").fill("53087");
    await page.getByRole("button", { name: "Connect" }).click();

    await expect(page.getByRole("heading", { name: "Room info", level: 2 })).toBeVisible();
    await expect(page.getByText("Seed: integration-ws-seed")).toBeVisible();
    await expect(page.getByText("Archipeladoku")).toBeVisible();
    assertNoPageErrors();
  });

  test("registers slot with Connect and shows Connected snackbar", async ({ page }) => {
    const assertNoPageErrors = trackPageErrors(page);
    await page.goto("/");
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Port").fill("53087");
    await page.getByRole("button", { name: "Connect" }).click();

    await page.getByRole("button", { name: "Archipeladoku" }).click();
    await page.getByLabel("Slot name").fill("Dandoku");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Connected as Dandoku.")).toBeVisible();
    await expect(page.getByText(/Dandoku · Archipeladoku/)).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Log out" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Overall status", level: 2 })).toBeVisible();
    await expect(page.getByText("50%")).toBeVisible();
    await expect(page.getByText("1 checked · 1 remaining")).toBeVisible();
    await expect(page.getByText("Hint points")).toBeVisible();
    await expect(page.getByText("3", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Checks", exact: true }).click();
    await expect(page.getByText("E2E Location Alpha")).toBeVisible();

    await page.getByRole("tab", { name: "Hints" }).click();
    await expect(page.getByRole("heading", { name: "Hints", level: 2 })).toBeVisible();
    await expect(page.getByRole("tab", { name: "For you (2)" })).toBeVisible();

    // Integration server returns two hints in Retrieved.keys — empty state must not win the race.
    await expect(page.getByText("No hints in this list.")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("E2E Item")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Hint status" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Priority" })).toBeVisible();
    await expect(page.getByText("E2E Location Alpha")).toBeVisible();
    await expect(page.getByText("Shared Trinket")).toBeVisible();
    await expect(page.getByText("E2E Location Beta")).toBeVisible();

    await page.getByRole("tab", { name: /In your world/ }).click();
    await expect(page.getByRole("columnheader", { name: "Goes to" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Hint status" })).toBeVisible();
    await expect(page.getByText("E2E Location Alpha")).toBeVisible();
    await expect(page.getByText("E2E Location Beta")).toBeVisible();

    await page.getByRole("tab", { name: "All (2)" }).click();
    await expect(page.getByRole("columnheader", { name: "Hint status" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Priority" })).toBeVisible();

    await page.getByRole("tab", { name: "Received checks" }).click();
    await expect(page.getByRole("heading", { name: "Received checks", level: 2 })).toBeVisible();
    await expect(page.getByText(/1 item received/)).toBeVisible();
    await expect(page.getByRole("cell", { name: "Shared Trinket" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "E2E Location Alpha" })).toBeVisible();
    await expect(page.getByText("E2E Location Beta")).toBeVisible();

    assertNoPageErrors();
  });

  test("slot logout reconnects and returns to room info with snackbar", async ({ page }) => {
    const assertNoPageErrors = trackPageErrors(page);
    await page.goto("/");
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Port").fill("53087");
    await page.getByRole("button", { name: "Connect" }).click();

    await page.getByRole("button", { name: "Archipeladoku" }).click();
    await page.getByLabel("Slot name").fill("Dandoku");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Overall status", level: 2 })).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("dialog", { name: "Session" })).toBeVisible();

    const dialogLogout = page.getByRole("dialog", { name: "Session" }).getByRole("button", { name: "Log out" });
    const reconnecting = dialogLogout.click();
    await expect
      .poll(
        async () =>
          (await page.getByRole("progressbar").count()) > 0 ||
          (await page.getByText(/Reconnected to room/).isVisible()),
        { timeout: 15_000 },
      )
      .toBeTruthy();
    await reconnecting;

    await expect(
      page.getByText("Reconnected to room. You can sign in to a slot when ready."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Room info", level: 2 })).toBeVisible();
    await expect(page.getByText("Seed: integration-ws-seed")).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Log out" })).toHaveCount(0);

    assertNoPageErrors();
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
