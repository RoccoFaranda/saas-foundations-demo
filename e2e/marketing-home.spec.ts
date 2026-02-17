import { expect, test } from "@playwright/test";

test.describe("Marketing home page @landing-ui", () => {
  test("renders finalized hero copy, CTA links, and six proof chips", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1, name: "An SaaS demo you can click through and audit." })
    ).toBeVisible();

    const exploreCta = page.getByRole("link", { name: "Explore Demo" });
    const technicalCta = page.getByRole("link", { name: "View Technical Scope" });
    const contactCta = page.getByRole("link", { name: "Contact", exact: true });

    await expect(exploreCta).toHaveAttribute("href", "/demo");
    await expect(technicalCta).toHaveAttribute("href", "/technical");
    await expect(contactCta).toHaveAttribute("href", "/contact");

    await expect(page.locator('[data-testid^="proof-chip-"]')).toHaveCount(6);
  });

  test("proof chips scroll to the proof section and highlight the selected card", async ({
    page,
  }) => {
    await page.goto("/");

    const targetChip = page.getByTestId("proof-chip-theme-accessibility");
    await targetChip.click();

    await expect(page).toHaveURL(/#features$/);

    const proofSection = page.locator("#features");
    const targetCard = page.getByTestId("proof-card-theme-accessibility");
    await expect(proofSection).toBeVisible();
    await expect(targetCard).toBeVisible();

    const headerBox = await page.locator("header").boundingBox();
    const proofSectionBox = await proofSection.boundingBox();

    expect(headerBox).not.toBeNull();
    expect(proofSectionBox).not.toBeNull();
    expect(proofSectionBox!.y).toBeGreaterThanOrEqual(Math.floor(headerBox!.height) - 1);

    await expect(targetCard).toHaveClass(/proof-card-highlight/);
  });

  test("proof chips are keyboard-activatable controls", async ({ page }) => {
    await page.goto("/");

    const chip = page.getByTestId("proof-chip-auth-lifecycle");
    await chip.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/#features$/);
    const targetCard = page.getByTestId("proof-card-auth-lifecycle");
    await expect(targetCard).toBeVisible();
    await expect(targetCard).toHaveClass(/proof-card-highlight/);
  });
});
