import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("displays the main heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Landing experience \+ real product interactions/i,
      })
    ).toBeVisible();
  });
});
