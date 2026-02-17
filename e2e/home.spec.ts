import { test, expect } from "@playwright/test";

test.describe("Home page @landing-ui", () => {
  test("displays the main heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /An SaaS demo you can click through and audit\./i,
      })
    ).toBeVisible();
  });
});
