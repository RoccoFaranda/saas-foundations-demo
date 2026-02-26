import { expect, test } from "@playwright/test";

test.describe("Legal pages", () => {
  test("privacy page renders heading, effective/updated rows, and compliance sections", async ({
    page,
  }) => {
    await page.goto("/privacy");

    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
    await expect(page.locator("dt", { hasText: "Effective date:" })).toBeVisible();
    await expect(page.locator("dt", { hasText: "Last updated:" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Data categories we process/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Cookies and local storage/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Complaints and supervisory authorities/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Automated decision-making/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Do not track and cross-site signals/i,
      })
    ).toBeVisible();
    await expect(page.locator("article a[href='/contact']").first()).toBeVisible();
    await expect(
      page.locator("article a[href='https://ico.org.uk/make-a-complaint/']").first()
    ).toBeVisible();
    await expect(
      page
        .locator("article a[href='https://www.edpb.europa.eu/about-edpb/about-edpb/members_en']")
        .first()
    ).toBeVisible();
    await expect(
      page.locator("article a[href='mailto:roccofaranda@gmail.com']").first()
    ).toBeVisible();
    await expect(page.locator("article a[href='/cookies']").first()).toBeVisible();

    await Promise.all([
      page.waitForURL("**/cookies"),
      page.locator("article a[href='/cookies']").first().click(),
    ]);
    await expect(page.getByRole("heading", { level: 1, name: "Cookie Declaration" })).toBeVisible();
  });

  test("terms page renders heading, effective/updated rows, and clickwrap-oriented acceptance", async ({
    page,
  }) => {
    await page.goto("/terms");

    await expect(
      page.getByRole("heading", { level: 1, name: "Terms and Conditions" })
    ).toBeVisible();
    await expect(page.locator("dt", { hasText: "Effective date:" })).toBeVisible();
    await expect(page.locator("dt", { hasText: "Last updated:" })).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Acceptable use and prohibited conduct/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Dispute resolution/i })
    ).toBeVisible();
    await expect(page.getByText(/signup checkbox/i)).toBeVisible();
    await expect(page.getByText(/USD 100/i)).toBeVisible();
    await expect(page.getByText(/30 days' advance notice/i)).toBeVisible();
    await expect(page.locator("article a[href='/contact']").first()).toBeVisible();

    const acceptancePermalink = page.locator("section#acceptance-of-terms h2 a");
    await expect(acceptancePermalink).toHaveAttribute("href", "#acceptance-of-terms");
    await acceptancePermalink.click();
    await expect(page).toHaveURL(/#acceptance-of-terms$/);
  });

  test("footer exposes privacy and terms links on public pages", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Terms" })).toBeVisible();
    await expect(footer.getByRole("button", { name: "Cookie Preferences" })).toBeVisible();

    await Promise.all([
      page.waitForURL("**/privacy"),
      footer.getByRole("link", { name: "Privacy" }).click(),
    ]);

    await page.goto("/");
    await Promise.all([
      page.waitForURL("**/terms"),
      footer.getByRole("link", { name: "Terms" }).click(),
    ]);
  });

  test("auth entry routes expose legal links and navigate correctly", async ({ page }) => {
    const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password"];

    for (const route of authRoutes) {
      await page.goto(route);

      const main = page.locator("main");
      const privacyLink = main.getByRole("link", { name: "Privacy", exact: true });
      const termsLink = main.getByRole("link", { name: "Terms", exact: true });
      const cookiePreferencesButton = main.getByRole("button", { name: "Cookie Preferences" });

      await expect(privacyLink).toBeVisible();
      await expect(termsLink).toBeVisible();
      await expect(cookiePreferencesButton).toBeVisible();

      await Promise.all([page.waitForURL("**/privacy"), privacyLink.click()]);

      await page.goto(route);
      await Promise.all([
        page.waitForURL("**/terms"),
        main.getByRole("link", { name: "Terms", exact: true }).click(),
      ]);
    }
  });
});
