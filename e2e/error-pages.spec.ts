import { expect, test } from "@playwright/test";

test.describe("Custom error pages", () => {
  test("renders custom 404 content for unknown routes", async ({ page }) => {
    await page.goto("/does-not-exist");

    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Go Back" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Email Support" })).toHaveAttribute(
      "href",
      /^mailto:/
    );
    await expect(page.locator("body")).toContainText("Support email:");
  });

  test("renders runtime error boundary UI for forced server errors", async ({ page }) => {
    await page.goto("/dev/force-error?mode=runtime");

    await expect(
      page.getByRole("heading", { level: 1, name: "Something went wrong" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh page" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Go Back" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go Home" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Email Support" })).toHaveAttribute(
      "href",
      /^mailto:/
    );
    await expect(page.locator("body")).toContainText("Support email:");
    await expect(page.locator("body")).not.toContainText("FORCED_RUNTIME_ERROR_FOR_E2E");
  });
});
