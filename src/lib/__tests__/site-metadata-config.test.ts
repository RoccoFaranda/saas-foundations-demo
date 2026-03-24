// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getLegalContactAddress,
  getLegalContactEmail,
  getLegalControllerName,
  getLegalDpoContact,
  getPublicContactEmail,
} from "../config/site-metadata";

describe("site metadata env config", () => {
  const originalEnv = { ...process.env };

  const restoreEnv = () => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key as keyof typeof process.env];
      }
    });
    Object.assign(process.env, originalEnv);
    vi.unstubAllEnvs();
  };

  beforeEach(() => {
    restoreEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("uses env values when provided", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_CONTACT_EMAIL", "owner@example.com");
    vi.stubEnv("LEGAL_CONTACT_EMAIL", "legal@example.com");
    vi.stubEnv("LEGAL_CONTROLLER_NAME", "Controller Name");
    vi.stubEnv("LEGAL_CONTACT_ADDRESS", "123 Demo Street");
    vi.stubEnv("LEGAL_DPO_CONTACT", "dpo@example.com");

    expect(getPublicContactEmail()).toBe("owner@example.com");
    expect(getLegalContactEmail()).toBe("legal@example.com");
    expect(getLegalControllerName()).toBe("Controller Name");
    expect(getLegalContactAddress()).toBe("123 Demo Street");
    expect(getLegalDpoContact()).toBe("dpo@example.com");
  });

  it("falls back to defaults in non-production for required values", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.PUBLIC_CONTACT_EMAIL;
    delete process.env.LEGAL_CONTACT_EMAIL;
    delete process.env.LEGAL_CONTROLLER_NAME;

    expect(getPublicContactEmail()).toBe("hello@saasfoundationsdemo.com");
    expect(getLegalContactEmail()).toBe("legal@saasfoundationsdemo.com");
    expect(getLegalControllerName()).toBe("Rocco Faranda (SaaS Foundations Demo)");
  });

  it("throws in production when required contact values are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.PUBLIC_CONTACT_EMAIL;
    delete process.env.LEGAL_CONTACT_EMAIL;
    delete process.env.LEGAL_CONTROLLER_NAME;

    expect(() => getPublicContactEmail()).toThrow("PUBLIC_CONTACT_EMAIL");
    expect(() => getLegalContactEmail()).toThrow("LEGAL_CONTACT_EMAIL");
    expect(() => getLegalControllerName()).toThrow("LEGAL_CONTROLLER_NAME");
  });

  it("throws in preview deployments when required contact values are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    delete process.env.PUBLIC_CONTACT_EMAIL;
    delete process.env.LEGAL_CONTACT_EMAIL;
    delete process.env.LEGAL_CONTROLLER_NAME;

    expect(() => getPublicContactEmail()).toThrow("PUBLIC_CONTACT_EMAIL");
    expect(() => getLegalContactEmail()).toThrow("LEGAL_CONTACT_EMAIL");
    expect(() => getLegalControllerName()).toThrow("LEGAL_CONTROLLER_NAME");
  });

  it("throws in production when required email values are invalid", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_CONTACT_EMAIL", "invalid-email");
    vi.stubEnv("LEGAL_CONTACT_EMAIL", "not-an-email");

    expect(() => getPublicContactEmail()).toThrow("PUBLIC_CONTACT_EMAIL");
    expect(() => getLegalContactEmail()).toThrow("LEGAL_CONTACT_EMAIL");
  });

  it("treats optional legal address and dpo values as nullable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LEGAL_CONTACT_ADDRESS", "  ");
    delete process.env.LEGAL_DPO_CONTACT;

    expect(getLegalContactAddress()).toBeNull();
    expect(getLegalDpoContact()).toBeNull();
  });
});
