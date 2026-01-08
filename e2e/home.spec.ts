import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("displays the main heading", async ({ page }) => {
    await page.goto("/");
    // Assert the marketing page heading
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("SaaS Foundations Demo");
  });
});
