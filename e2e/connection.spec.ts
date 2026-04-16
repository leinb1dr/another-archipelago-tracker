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
    await expect(page.getByRole("banner")).toContainText("127.0.0.1:53087");
    await expect(page.getByText("Seed: integration-ws-seed")).toBeVisible();
    await expect(page.getByText("Pick Me Game").first()).toBeVisible();

    const messageLog = page.getByRole("region", { name: "Message log" });
    await expect(messageLog).toBeVisible();
    if ((await messageLog.getAttribute("aria-expanded")) !== "true") {
      await messageLog.getByRole("button").first().click();
      await expect(messageLog).toHaveAttribute("aria-expanded", "true");
    }
    await expect(messageLog).toContainText("RoomInfo");
    await expect(messageLog).toContainText("integration-ws-seed");
    await expect(messageLog).toContainText("Pick Me Game");

    assertNoPageErrors();
  });

  test("registers multiple slots and switches active tracker session", async ({ page }) => {
    const assertNoPageErrors = trackPageErrors(page);
    await page.goto("/");
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Port").fill("53087");
    await page.getByRole("button", { name: "Connect" }).click();

    await page.getByText("Pick Me Game").first().click();
    await page.getByLabel("Slot name").fill("Dandoku");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Connected as Dandoku.")).toBeVisible();
    await expect(page.getByText(/Dandoku · Pick Me Game/)).toBeVisible();
    const activeSlotCombobox = page.getByRole("combobox", { name: /Active slot/i });
    await expect(activeSlotCombobox).toBeVisible();
    await expect(activeSlotCombobox).toContainText("Dandoku");
    await expect(page.getByRole("banner").getByRole("button", { name: "Log out" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Add slot", level: 2 })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Overall status", level: 2 })).toBeVisible();
    await expect(page.getByText("33.3%")).toBeVisible();
    await expect(page.getByText("1 checked · 2 remaining")).toBeVisible();
    await expect(page.getByText("Hint points")).toBeVisible();
    await expect(page.getByText("3", { exact: true })).toBeVisible();

    await page.getByRole("tab", { name: "Checks", exact: true }).click();
    // Default Checks sub-tab is Received; location rows live under Sent.
    await page.getByRole("tab", { name: "Sent" }).click();
    await expect(page.getByText("E2E Location Alpha")).toBeVisible();
    await expect(page.getByText("E2E Scout Target")).toBeVisible();

    await page.getByRole("button", { name: "Scout" }).click();
    await expect(page.getByText(/^Scout:/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Progression").first()).toBeVisible();

    await page.getByRole("tab", { name: "Hints" }).click();
    await expect(page.getByRole("heading", { name: "Hints", level: 2 })).toBeVisible();
    await expect(page.getByRole("tab", { name: "For you (2)" })).toBeVisible();

    // Integration server returns two hints in Retrieved.keys — empty state must not win the race.
    await expect(page.getByText("No hints in this list.")).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText("E2E Item")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Hint status" })).toBeVisible();
    await expect(page.getByText("Priority").first()).toBeVisible();
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
    await expect(page.getByText("Priority").first()).toBeVisible();

    await page.getByRole("tab", { name: "Checks", exact: true }).click();
    await page.getByRole("tab", { name: /^Received \(\d+\)$/ }).click();
    await expect(page.getByRole("heading", { name: "Checks", level: 2 })).toBeVisible();
    await expect(page.getByText(/1 item received/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("cell", { name: "Shared Trinket" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "E2E Location Alpha" })).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: "Add slot" }).click();
    await expect(page.getByRole("heading", { name: "Add slot", level: 2 })).toBeVisible();
    await expect(page.getByText("Seed: integration-ws-seed")).toHaveCount(0);
    await expect(page.getByText("Connected (Dandoku)")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Log out saved sign-in Pick Me Game Dandoku" }),
    ).toBeVisible();
    await page.getByText("Second Quest").first().click();
    await page.getByLabel("Slot name").fill("Ranger");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Connected as Ranger.")).toBeVisible();
    await expect(activeSlotCombobox).toContainText("Ranger");
    await expect(page.getByText(/Ranger · Second Quest/)).toBeVisible();

    await activeSlotCombobox.click();
    await page.getByRole("option", { name: "Dandoku · Pick Me Game" }).click();
    await expect(activeSlotCombobox).toContainText("Dandoku · Pick Me Game");

    assertNoPageErrors();
  });

  test("slot logout removes only active slot session", async ({ page }) => {
    const assertNoPageErrors = trackPageErrors(page);
    await page.goto("/");
    await page.getByLabel("Host").fill("127.0.0.1");
    await page.getByLabel("Port").fill("53087");
    await page.getByRole("button", { name: "Connect" }).click();

    await page.getByText("Pick Me Game").first().click();
    await page.getByLabel("Slot name").fill("Dandoku");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Overall status", level: 2 })).toBeVisible();

    await page.getByRole("banner").getByRole("button", { name: "Log out" }).click();
    await expect(page.getByRole("dialog", { name: "Session" })).toBeVisible();

    const dialogLogout = page.getByRole("dialog", { name: "Session" }).getByRole("button", { name: "Log out" });
    await dialogLogout.click();
    await expect(page.getByRole("heading", { name: "Room info", level: 2 })).toBeVisible();
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
