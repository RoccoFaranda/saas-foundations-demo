import { expect, test } from "@playwright/test";

test.describe("Marketing home page @landing-ui", () => {
  test("renders finalized hero copy, CTA links, and six proof chips", async ({ page }) => {
    await page.goto("/");

    const heroSection = page.locator("section").first();

    await expect(
      heroSection.getByRole("heading", {
        level: 1,
        name: "A production-style SaaS demo, end to end.",
      })
    ).toBeVisible();

    const exploreCta = heroSection.getByRole("link", { name: "Explore Demo" });
    const technicalCta = heroSection.getByRole("link", { name: "View Technical Scope" });
    const contactCta = heroSection.getByRole("link", { name: "Contact", exact: true });

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
