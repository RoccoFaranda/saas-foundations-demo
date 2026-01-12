import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
  test("switches to dark theme and adds dark class to html", async ({
    page,
  }) => {
    await page.goto("/");

    const themeToggle = page.getByTestId("theme-toggle");
    await expect(themeToggle).toBeVisible();

    // Select dark theme
    await themeToggle.selectOption("dark");

    // Assert html has dark class
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("switches to light theme and removes dark class from html", async ({
    page,
  }) => {
    await page.goto("/");

    const themeToggle = page.getByTestId("theme-toggle");

    // First set to dark
    await themeToggle.selectOption("dark");
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Then switch to light
    await themeToggle.selectOption("light");

    // Assert html does not have dark class
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("persists theme selection across page reload", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.getByTestId("theme-toggle");

    // Select dark theme
    await themeToggle.selectOption("dark");
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Reload the page
    await page.reload();

    // Assert dark class persists after reload
    await expect(page.locator("html")).toHaveClass(/dark/);

    // Assert the select still shows dark as selected
    await expect(page.getByTestId("theme-toggle")).toHaveValue("dark");
  });

  test("system theme respects OS dark mode preference", async ({ page }) => {
    // Emulate dark color scheme (OS preference)
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/");

    const themeToggle = page.getByTestId("theme-toggle");

    // Select system theme
    await themeToggle.selectOption("system");

    // Assert html has dark class (following OS preference)
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("system theme respects OS light mode preference", async ({ page }) => {
    // Emulate light color scheme (OS preference)
    await page.emulateMedia({ colorScheme: "light" });

    await page.goto("/");

    const themeToggle = page.getByTestId("theme-toggle");

    // Select system theme
    await themeToggle.selectOption("system");

    // Assert html does not have dark class (following OS preference)
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });
});

