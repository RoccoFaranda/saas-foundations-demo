import { expect, test } from "@playwright/test";

test.describe("Technical page", () => {
  test("renders reviewer-facing proof sections and key navigation paths", async ({ page }) => {
    await page.goto("/technical");

    await expect(
      page.getByRole("heading", { level: 1, name: "Proof for the boring parts that matter." })
    ).toBeVisible();
    await expect(page.getByText("Next.js 16, React 19, and TypeScript on Node 24")).toBeVisible();
    await expect(page.getByText("Tailwind CSS")).toBeVisible();
    await expect(page.getByText("Production services")).toBeVisible();
    await expect(page.getByText("Vercel hosting")).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 2, name: "Auth and session model" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Public abuse prevention" })
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Operational safety" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "Test and release discipline" })
    ).toBeVisible();

    await expect(page.getByRole("link", { name: "Try Signup Flow" }).first()).toHaveAttribute(
      "href",
      "/signup"
    );
    await expect(page.getByRole("link", { name: "Open Demo App" }).first()).toHaveAttribute(
      "href",
      "/demo"
    );
    await expect(page.getByRole("link", { name: "View Repository" }).first()).toHaveAttribute(
      "href",
      /github\.com\/RoccoFaranda\/saas-foundations-demo/
    );
  });
});
