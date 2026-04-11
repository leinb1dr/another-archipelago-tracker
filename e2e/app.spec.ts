import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("renders title and connection form", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Archipelago Tracker" }),
    ).toBeVisible();

    await expect(page.getByLabel("Host")).toBeVisible();
    await expect(page.getByLabel("Port")).toBeVisible();
  });
});
