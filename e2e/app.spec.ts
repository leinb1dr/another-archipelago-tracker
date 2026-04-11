import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("renders title and intro copy", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Archipelago Tracker" }),
    ).toBeVisible();

    const body = page.getByText(/Connect to an Archipelago server/);
    await expect(body).toBeVisible();
    await expect(body).toContainText("multiworld");
  });
});
