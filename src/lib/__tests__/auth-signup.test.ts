// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

const authMock = vi.hoisted(() => vi.fn());
const signInMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  default: vi.fn(() => ({
    handlers: {},
    auth: authMock,
    signIn: signInMock,
    signOut: vi.fn(),
  })),
}));
vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-forwarded-for": "203.0.113.10" }),
}));

// Mock fetch for Turnstile verification
const fetchMock = vi.hoisted(() => vi.fn());
global.fetch = fetchMock;

import { signup } from "../auth/actions";
import { testEmailHelpers } from "../auth/email";
import { setRateLimiterFactoryForTests } from "../ratelimit";

describe("signup", () => {
  beforeEach(() => {
    testEmailHelpers.reset();
    authMock.mockReset();
    signInMock.mockReset();
    fetchMock.mockReset();
    delete process.env.TURNSTILE_ALLOW_BYPASS;
    setRateLimiterFactoryForTests(() => ({
      limit: async () => ({ allowed: true, limit: 3, remaining: 2, resetAt: Date.now() + 60000 }),
    }));
  });

  it("should fail when Turnstile token is missing", async () => {
    const email = `signup-test-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");

    const result = await signup(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Verification failed. Please try again.");
    }
  });

  it("should fail when Turnstile verification returns false", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    });

    const email = `signup-test-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");
    form.set("cf-turnstile-response", "invalid-token");

    const result = await signup(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Verification failed. Please try again.");
    }
    expect(fetchMock).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
    );
  });

  it("should succeed when Turnstile verification passes", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    signInMock.mockResolvedValueOnce("/verify-email");

    const email = `signup-test-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");
    form.set("cf-turnstile-response", "valid-token");

    const result = await signup(form);

    expect(result.success).toBe(true);
    const [, options] = fetchMock.mock.calls[0] ?? [];
    expect(options?.method).toBe("POST");
    expect(options?.body).toBeInstanceOf(URLSearchParams);
    expect((options?.body as URLSearchParams).toString()).toContain("response=valid-token");

    const emails = testEmailHelpers.findByTo(email);
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toContain("Verify your email");
  });

  it("should skip Turnstile verification when secret key is not configured", async () => {
    const originalSecret = process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SECRET_KEY;

    signInMock.mockResolvedValueOnce("/verify-email");

    const email = `signup-test-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");
    // No Turnstile token provided

    const result = await signup(form);

    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    // Restore env
    if (originalSecret) {
      process.env.TURNSTILE_SECRET_KEY = originalSecret;
    }
  });

  it("should bypass Turnstile verification when bypass flag is enabled", async () => {
    const originalBypass = process.env.TURNSTILE_ALLOW_BYPASS;
    process.env.TURNSTILE_ALLOW_BYPASS = "true";

    signInMock.mockResolvedValueOnce("/verify-email");

    const email = `signup-test-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");
    // No Turnstile token provided

    const result = await signup(form);

    expect(result.success).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    if (originalBypass) {
      process.env.TURNSTILE_ALLOW_BYPASS = originalBypass;
    } else {
      delete process.env.TURNSTILE_ALLOW_BYPASS;
    }
  });

  it("should fail when Turnstile is required but misconfigured", async () => {
    const originalSecret = process.env.TURNSTILE_SECRET_KEY;

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", originalSecret ?? "secret-key");

    const email = `signup-test-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");

    const result = await signup(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Sign up is temporarily unavailable. Please contact support.");
    }
    expect(fetchMock).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it("should fail when Turnstile verification fetch errors", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const email = `signup-test-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");
    form.set("cf-turnstile-response", "token");

    const result = await signup(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Verification failed. Please try again.");
    }
  });

  it("should fail when Turnstile verification returns non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const email = `signup-test-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");
    form.set("cf-turnstile-response", "token");

    const result = await signup(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Verification failed. Please try again.");
    }
  });
});
