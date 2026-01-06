import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("displays the main heading", async ({ page }) => {
    await page.goto("/");
    // Assert the stable heading from the default Next.js page
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("get started");
  });
});
