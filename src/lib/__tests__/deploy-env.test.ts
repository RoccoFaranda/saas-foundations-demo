// @vitest-environment node
import { describe, expect, it } from "vitest";

import { validateDeployEnvironment, type DeployEnvironmentValidation } from "../config/deploy-env";
import { resolveAppUrl } from "../config/deployment";

function createBaseDeployedEnv(): Record<string, string> {
  return {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/demo?schema=public",
    AUTH_SECRET: "auth_secret_value",
    TOKEN_HASH_SECRET: "token_hash_secret_value",
    CONSENT_AUDIT_SIGNING_SECRET: "consent_signing_secret_value",
    READINESS_SECRET: "readiness_secret_value",
    CRON_SECRET: "cron_secret_value",
    RESEND_API_KEY: "re_placeholder_key",
    EMAIL_FROM: "SaaS Foundations Demo <notifications@example.com>",
    SUPPORT_EMAIL: "support@example.com",
    PUBLIC_CONTACT_EMAIL: "public-contact@example.com",
    LEGAL_CONTACT_EMAIL: "legal-contact@example.com",
    LEGAL_CONTROLLER_NAME: "SaaS Foundations Demo Controller",
    UPSTASH_REDIS_REST_URL: "https://example-upstash.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "upstash-token",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "live_turnstile_site_key_placeholder_123456",
    TURNSTILE_SECRET_KEY: "live_turnstile_secret_key_placeholder_1234567890",
    NEXT_PUBLIC_APP_URL: "https://www.saasfoundationsdemo.com",
  };
}

function expectCleanValidation(result: DeployEnvironmentValidation): void {
  expect(result.errors).toEqual([]);
  expect(result.warnings).toEqual([]);
}

describe("resolveAppUrl", () => {
  it("falls back to VERCEL_URL for preview deployments when NEXT_PUBLIC_APP_URL is unset", () => {
    const result = resolveAppUrl({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "preview-demo.vercel.app",
      NEXT_PUBLIC_APP_URL: "",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        origin: "https://preview-demo.vercel.app",
        source: "vercel-preview",
      },
    });
  });

  it("fails in production when NEXT_PUBLIC_APP_URL is unset", () => {
    const result = resolveAppUrl({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_URL: "",
    });

    expect(result).toEqual({
      ok: false,
      message: "NEXT_PUBLIC_APP_URL is required for production deployments.",
    });
  });
});

describe("validateDeployEnvironment", () => {
  it("accepts preview validation with Vercel URL fallback", () => {
    const env = createBaseDeployedEnv();
    delete env.NEXT_PUBLIC_APP_URL;
    env.VERCEL_URL = "preview-demo.vercel.app";

    const result = validateDeployEnvironment({ env, target: "preview" });

    expectCleanValidation(result);
  });

  it("warns instead of failing for explicit production override flags", () => {
    const env = createBaseDeployedEnv();
    env.ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK = "true";
    env.TURNSTILE_ALLOW_BYPASS = "true";
    env.ALLOW_DEV_MAILBOX_IN_PROD = "true";

    const result = validateDeployEnvironment({ env, target: "production" });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK=true"),
        expect.stringContaining("TURNSTILE_ALLOW_BYPASS=true"),
        expect.stringContaining("ALLOW_DEV_MAILBOX_IN_PROD=true"),
      ])
    );
  });

  it("fails production validation when Upstash is missing and fallback is not enabled", () => {
    const env = createBaseDeployedEnv();
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;

    const result = validateDeployEnvironment({ env, target: "production" });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Upstash Redis env is missing for production"),
      ])
    );
  });

  it("accepts Vercel Upstash KV env aliases", () => {
    const env = createBaseDeployedEnv();
    delete env.UPSTASH_REDIS_REST_URL;
    delete env.UPSTASH_REDIS_REST_TOKEN;
    env.KV_REST_API_URL = "https://kv-example.upstash.io";
    env.KV_REST_API_TOKEN = "kv-token";

    const result = validateDeployEnvironment({ env, target: "production" });

    expectCleanValidation(result);
  });

  it("warns when explicit Upstash envs conflict with Vercel KV aliases", () => {
    const env = createBaseDeployedEnv();
    env.KV_REST_API_URL = "https://kv-example.upstash.io";
    env.KV_REST_API_TOKEN = "kv-token";

    const result = validateDeployEnvironment({ env, target: "production" });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "Both UPSTASH_REDIS_REST_* and KV_REST_API_* are set with different values"
        ),
      ])
    );
  });
});
