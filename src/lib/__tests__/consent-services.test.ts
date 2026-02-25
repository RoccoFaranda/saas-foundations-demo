import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_CATEGORIES } from "../consent/types";

const originalDemoAnalyticsFlag = process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS;

async function loadConsentServicesModule(demoAnalyticsFlag: "true" | "false") {
  process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS = demoAnalyticsFlag;
  vi.resetModules();
  return import("../consent/services");
}

afterEach(() => {
  if (originalDemoAnalyticsFlag === undefined) {
    delete process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS;
  } else {
    process.env.NEXT_PUBLIC_CONSENT_DEMO_ANALYTICS = originalDemoAnalyticsFlag;
  }
  vi.resetModules();
});

describe("consent services registry", () => {
  it("returns table rows with full required metadata", async () => {
    const consentServices = await loadConsentServicesModule("false");
    const rows = consentServices.getConsentTableRows();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.serviceId.length).toBeGreaterThan(0);
      expect(row.serviceName.length).toBeGreaterThan(0);
      expect(row.key.length).toBeGreaterThan(0);
      expect(row.duration.length).toBeGreaterThan(0);
      expect(row.purpose.length).toBeGreaterThan(0);
      expect(row.provider.length).toBeGreaterThan(0);
      expect(["first_party", "third_party"]).toContain(row.party);
      expect(["cookie", "local_storage", "session_storage", "token_or_request"]).toContain(
        row.storageType
      );
    }
  });

  it("includes core cookie and storage identifiers used at runtime", async () => {
    const consentServices = await loadConsentServicesModule("false");
    const rows = consentServices.getConsentTableRows();

    expect(rows.some((row) => row.key === "sf_consent" && row.storageType === "cookie")).toBe(true);
    expect(
      rows.some((row) => row.key === "authjs.csrf-token" && row.storageType === "cookie")
    ).toBe(true);
    expect(
      rows.some((row) => row.key === "authjs.callback-url" && row.storageType === "cookie")
    ).toBe(true);
    expect(rows.some((row) => row.key === "theme" && row.storageType === "local_storage")).toBe(
      true
    );
    expect(
      rows.some(
        (row) => row.key === "sf-consent-audit-queue:v2" && row.storageType === "local_storage"
      )
    ).toBe(true);
  });

  it("sorts rows deterministically by category, service name, and key", async () => {
    const consentServices = await loadConsentServicesModule("false");
    const rows = consentServices.getConsentTableRows();
    const categoryOrder = new Map(CONSENT_CATEGORIES.map((category, index) => [category, index]));

    const expected = [...rows].sort((left, right) => {
      const leftCategoryOrder = categoryOrder.get(left.category) ?? Number.MAX_SAFE_INTEGER;
      const rightCategoryOrder = categoryOrder.get(right.category) ?? Number.MAX_SAFE_INTEGER;
      if (leftCategoryOrder !== rightCategoryOrder) {
        return leftCategoryOrder - rightCategoryOrder;
      }

      const serviceNameOrder = left.serviceName.localeCompare(right.serviceName);
      if (serviceNameOrder !== 0) {
        return serviceNameOrder;
      }

      return left.key.localeCompare(right.key);
    });

    const serialize = (row: (typeof rows)[number]) =>
      `${row.category}|${row.serviceName}|${row.key}|${row.duration}|${row.purpose}`;
    expect(rows.map(serialize)).toEqual(expected.map(serialize));
  });

  it("excludes non-essential rows when demo analytics service is disabled", async () => {
    const consentServices = await loadConsentServicesModule("false");
    const rows = consentServices.getConsentTableRows();

    expect(consentServices.HAS_NON_ESSENTIAL_CONSENT_SERVICES).toBe(false);
    expect(rows.every((row) => row.required)).toBe(true);
    expect(rows.some((row) => row.category === "analytics")).toBe(false);
  });

  it("groups rows by category without empty groups and includes non-essential rows when enabled", async () => {
    const consentServices = await loadConsentServicesModule("true");
    const groups = consentServices.getConsentRowsByCategory();
    const rows = consentServices.getConsentTableRows();

    expect(consentServices.HAS_NON_ESSENTIAL_CONSENT_SERVICES).toBe(true);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((group) => group.rows.length > 0)).toBe(true);
    expect(groups.every((group) => CONSENT_CATEGORIES.includes(group.category))).toBe(true);
    expect(rows.some((row) => row.category === "analytics" && !row.required)).toBe(true);
  });
});
