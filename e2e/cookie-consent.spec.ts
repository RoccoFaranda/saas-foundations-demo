import { expect, test, type Page } from "@playwright/test";

async function hasNonEssentialServicesEnabled(page: Page): Promise<boolean> {
  const response = await page.request.get("/api/consent");
  if (!response.ok()) {
    throw new Error(`Failed to fetch consent runtime flags: ${response.status()}`);
  }
  const payload = (await response.json()) as { hasNonEssentialServices?: unknown };
  return payload.hasNonEssentialServices === true;
}

function parseConsentCookie(value: string) {
  const candidates = [value];
  try {
    candidates.push(decodeURIComponent(value));
  } catch {
    // Ignore decode failures and continue.
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Not JSON, continue.
    }

    try {
      const normalized = candidate.replace(/-/g, "+").replace(/_/g, "/");
      const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
      const decoded = Buffer.from(padded, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch {
      // Not base64url JSON, continue.
    }
  }

  throw new Error("Unable to parse consent cookie payload.");
}

test.describe("Cookie consent", () => {
  test("first-visit banner visibility matches optional-service runtime config", async ({
    page,
  }) => {
    await page.goto("/");
    const hasNonEssentialServices = await hasNonEssentialServicesEnabled(page);

    if (hasNonEssentialServices) {
      await expect(page.getByText("Cookie choices")).toBeVisible();
      return;
    }

    await expect(page.getByText("Cookie choices")).toHaveCount(0);
  });

  test("cookie details are discoverable in preferences and on the /cookies page", async ({
    page,
  }) => {
    await page.goto("/");
    const hasNonEssentialServices = await hasNonEssentialServicesEnabled(page);

    const footer = page.locator("footer");
    await footer.getByRole("button", { name: "Cookie Preferences" }).click();
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toBeVisible();
    await expect(page.getByText("View Necessary cookie details")).toBeVisible();

    await page.getByText("View Necessary cookie details").click();
    await expect(page.getByRole("table").first()).toBeVisible();
    await expect(page.getByText("authjs.session-token").first()).toBeVisible();

    await Promise.all([
      page.waitForURL("**/cookies"),
      page.getByRole("link", { name: "Open full cookie declaration" }).click(),
    ]);
    await expect(page.getByRole("heading", { level: 1, name: "Cookie Declaration" })).toBeVisible();
    await expect(page.getByText("Identifier key")).toBeVisible();
    const noOptionalServicesNotice = page.getByText(
      "No optional categories are currently active in this release"
    );
    if (hasNonEssentialServices) {
      await expect(noOptionalServicesNotice).toHaveCount(0);
    } else {
      await expect(noOptionalServicesNotice).toBeVisible();
    }
  });

  test("cookie preferences are discoverable in header/footer and persist after save", async ({
    page,
  }) => {
    await page.goto("/");

    await page.locator("header").getByRole("button", { name: "Cookie Preferences" }).click();
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toHaveCount(0);

    const footer = page.locator("footer");
    await footer.getByRole("button", { name: "Cookie Preferences" }).click();
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toBeVisible();

    const analyticsCheckbox = page.getByLabel("Analytics cookies");
    await expect(analyticsCheckbox).not.toBeChecked();
    await analyticsCheckbox.check();

    const consentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/consent") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Save preferences" }).click();
    const consentResponse = await consentResponsePromise;
    expect(consentResponse.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toHaveCount(0);

    const consentCookie = (await page.context().cookies("http://localhost:3001")).find(
      (cookie) => cookie.name === "sf_consent"
    );
    expect(consentCookie).toBeDefined();
    const parsed = parseConsentCookie(consentCookie!.value);
    expect(parsed.categories.necessary).toBe(true);
    expect(parsed.categories.analytics).toBe(true);

    await page.reload();
    await page.locator("footer").getByRole("button", { name: "Cookie Preferences" }).click();
    await expect(page.getByLabel("Analytics cookies")).toBeChecked();
  });

  test("modal Accept all and Reject all only change local toggles until Save preferences", async ({
    page,
  }) => {
    const consentPostSources: string[] = [];
    page.on("request", (request) => {
      if (!request.url().includes("/api/consent") || request.method() !== "POST") {
        return;
      }
      const payload = request.postDataJSON() as { source?: string } | null;
      consentPostSources.push(payload?.source ?? "unknown");
    });

    await page.goto("/");
    await page.locator("footer").getByRole("button", { name: "Cookie Preferences" }).click();
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toBeVisible();

    const functionalCheckbox = page.getByLabel("Functional cookies");
    const analyticsCheckbox = page.getByLabel("Analytics cookies");
    const marketingCheckbox = page.getByLabel("Marketing cookies");

    await page.getByRole("button", { name: "Accept all" }).click();
    await expect(functionalCheckbox).toBeChecked();
    await expect(analyticsCheckbox).toBeChecked();
    await expect(marketingCheckbox).toBeChecked();

    await page.getByRole("button", { name: "Reject all" }).click();
    await expect(functionalCheckbox).not.toBeChecked();
    await expect(analyticsCheckbox).not.toBeChecked();
    await expect(marketingCheckbox).not.toBeChecked();

    await expect.poll(() => consentPostSources.length).toBe(0);

    const consentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/consent") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Save preferences" }).click();
    const consentResponse = await consentResponsePromise;
    expect(consentResponse.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toHaveCount(0);

    expect(consentPostSources).toEqual(["preferences_save"]);
  });

  test("syncs banner visibility across tabs after consent is saved @optional-on", async ({
    page,
  }) => {
    await page.goto("/");

    const banner = page.getByText("Cookie choices");
    if ((await banner.count()) === 0) {
      test.skip(true, "No non-essential services are active in this environment.");
    }

    const otherTab = await page.context().newPage();
    await otherTab.goto("/");
    await expect(otherTab.getByText("Cookie choices")).toBeVisible();

    const consentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/consent") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Accept all" }).click();
    const consentResponse = await consentResponsePromise;
    expect(consentResponse.status()).toBe(200);

    await expect(page.getByText("Cookie choices")).toHaveCount(0);
    await expect(otherTab.getByText("Cookie choices")).toHaveCount(0);

    await otherTab.close();
  });

  test("keeps open-modal edits local and refreshes values on reopen after cross-tab save @optional-on", async ({
    page,
  }) => {
    await page.goto("/");

    const banner = page.getByText("Cookie choices");
    if ((await banner.count()) === 0) {
      test.skip(true, "No non-essential services are active in this environment.");
    }

    const otherTab = await page.context().newPage();
    await otherTab.goto("/");

    await otherTab.locator("footer").getByRole("button", { name: "Cookie Preferences" }).click();
    await expect(otherTab.getByRole("heading", { name: "Cookie Preferences" })).toBeVisible();

    const analyticsOnOtherTab = otherTab.getByLabel("Analytics cookies");
    await analyticsOnOtherTab.check();
    await expect(analyticsOnOtherTab).toBeChecked();

    await page.getByRole("button", { name: "Customize" }).click();
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toBeVisible();
    await page.getByRole("button", { name: "Reject all" }).click();

    const consentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/consent") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Save preferences" }).click();
    const consentResponse = await consentResponsePromise;
    expect(consentResponse.status()).toBe(200);

    await expect(analyticsOnOtherTab).toBeChecked();

    await otherTab.getByRole("button", { name: "Close" }).click();
    await expect(otherTab.getByRole("heading", { name: "Cookie Preferences" })).toHaveCount(0);

    await otherTab.locator("footer").getByRole("button", { name: "Cookie Preferences" }).click();
    await expect(otherTab.getByLabel("Analytics cookies")).not.toBeChecked();

    await otherTab.close();
  });

  test("syncs via storage fallback when BroadcastChannel is unavailable @optional-on", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const firstTab = await context.newPage();
    const secondTab = await context.newPage();

    const disableBroadcastChannel = () => {
      Object.defineProperty(window, "BroadcastChannel", {
        configurable: true,
        value: undefined,
      });
    };

    await firstTab.addInitScript(disableBroadcastChannel);
    await secondTab.addInitScript(disableBroadcastChannel);

    await firstTab.goto("/");
    const banner = firstTab.getByText("Cookie choices");
    if ((await banner.count()) === 0) {
      await context.close();
      test.skip(true, "No non-essential services are active in this environment.");
    }

    await secondTab.goto("/");
    await expect(secondTab.getByText("Cookie choices")).toBeVisible();

    const consentResponsePromise = firstTab.waitForResponse(
      (response) =>
        response.url().includes("/api/consent") && response.request().method() === "POST"
    );
    await firstTab.getByRole("button", { name: "Accept all" }).click();
    const consentResponse = await consentResponsePromise;
    expect(consentResponse.status()).toBe(200);

    await expect(firstTab.getByText("Cookie choices")).toHaveCount(0);
    await expect(secondTab.getByText("Cookie choices")).toHaveCount(0);

    await context.close();
  });

  test("GPC header forces optional categories off", async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ "Sec-GPC": "1" });
    await page.goto("/login");

    await page.getByRole("button", { name: "Cookie Preferences" }).click();
    await expect(page.getByRole("heading", { name: "Cookie Preferences" })).toBeVisible();

    const analyticsCheckbox = page.getByLabel("Analytics cookies");
    await analyticsCheckbox.check();
    const consentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/consent") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Save preferences" }).click();
    const consentResponse = await consentResponsePromise;
    expect(consentResponse.status()).toBe(200);

    const consentCookie = (await page.context().cookies("http://localhost:3001")).find(
      (cookie) => cookie.name === "sf_consent"
    );
    expect(consentCookie).toBeDefined();
    const parsed = parseConsentCookie(consentCookie!.value);
    expect(parsed.source).toBe("gpc");
    expect(parsed.gpcHonored).toBe(true);
    expect(parsed.categories.functional).toBe(false);
    expect(parsed.categories.analytics).toBe(false);
    expect(parsed.categories.marketing).toBe(false);
  });
});
