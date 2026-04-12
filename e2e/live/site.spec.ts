import { expect, test } from "@playwright/test";
import { trackPageErrors } from "../fixtures/pageErrors";

const liveArchipelagoHost = process.env.E2E_ARCHIPELAGO_HOST?.trim();
const liveArchipelagoPort = process.env.E2E_ARCHIPELAGO_PORT?.trim();
const liveGameTitle = process.env.E2E_ARCHIPELAGO_GAME?.trim();
const liveSlotName = process.env.E2E_SLOT_NAME?.trim();
const liveSlotPassword = process.env.E2E_SLOT_PASSWORD?.trim();

const hasLiveServerCoords = Boolean(liveArchipelagoHost && liveArchipelagoPort);
const hasSignInCoords = Boolean(
  liveArchipelagoHost && liveArchipelagoPort && liveGameTitle && liveSlotName,
);

test.describe("live site", () => {
  test("renders connection shell", async ({ page }) => {
    const assertNoPageErrors = trackPageErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Archipelago Tracker" })).toBeVisible();
    await expect(page.getByLabel("Host")).toBeVisible();
    await expect(page.getByLabel("Port")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect" })).toBeVisible();
    assertNoPageErrors();
  });

  /** WebSocket connect only — stops at Room info (no slot / Connect packet). */
  test("connects to configured Archipelago server and shows room info", async ({ page }) => {
    test.skip(
      !hasLiveServerCoords,
      "Set E2E_ARCHIPELAGO_HOST and E2E_ARCHIPELAGO_PORT to a live room (WebSocket listening).",
    );

    const assertNoPageErrors = trackPageErrors(page);
    await page.goto("/");
    await page.getByLabel("Host").fill(liveArchipelagoHost!);
    await page.getByLabel("Port").fill(liveArchipelagoPort!);
    await page.getByRole("button", { name: "Connect" }).click();

    await expect(page.getByRole("heading", { name: "Room info", level: 2 })).toBeVisible({
      timeout: 60_000,
    });
    assertNoPageErrors();
  });

  /** Full tracker sign-in: Connect packet after picking a game (same as real usage). */
  test("connects and signs in to a slot", async ({ page }) => {
    test.skip(
      !hasSignInCoords,
      "Set E2E_ARCHIPELAGO_HOST, E2E_ARCHIPELAGO_PORT, E2E_ARCHIPELAGO_GAME (exact game name in room list), and E2E_SLOT_NAME.",
    );

    const assertNoPageErrors = trackPageErrors(page);
    await page.goto("/");
    await page.getByLabel("Host").fill(liveArchipelagoHost!);
    await page.getByLabel("Port").fill(liveArchipelagoPort!);
    await page.getByRole("button", { name: "Connect" }).click();

    await expect(page.getByRole("heading", { name: "Room info", level: 2 })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByRole("button", { name: liveGameTitle! }).click();
    await expect(page.getByRole("dialog", { name: "Register slot" })).toBeVisible();
    await page.getByLabel("Slot name").fill(liveSlotName!);
    if (liveSlotPassword) {
      await page.getByLabel("Password").fill(liveSlotPassword);
    }
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/Connected as\b/)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Overall status", level: 2 })).toBeVisible();

    await page.getByRole("tab", { name: "Hints" }).click();
    await expect(page.getByRole("heading", { name: "Hints", level: 2 })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^For you \(\d+\)/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^In your world \(\d+\)/ })).toBeVisible();
    const allHintsTab = page.getByRole("tab", { name: /^All \(\d+\)/ });
    await expect(allHintsTab).toBeVisible();
    const allTabLabel = (await allHintsTab.textContent()) ?? "";
    const allCountMatch = /^All \((\d+)\)/.exec(allTabLabel);
    const hintCount = allCountMatch ? Number(allCountMatch[1]) : 0;

    await allHintsTab.click();
    if (hintCount === 0) {
      await expect(page.getByText("No hints in this list.")).toBeVisible();
    } else {
      await expect(page.getByText("No hints in this list.")).toBeHidden({ timeout: 30_000 });
      await expect(page.getByRole("columnheader", { name: "Hint status" })).toBeVisible();
    }

    assertNoPageErrors();
  });
});
