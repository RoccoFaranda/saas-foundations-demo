// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

const authMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  default: vi.fn(() => ({
    handlers: {},
    auth: authMock,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));
vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-forwarded-for": "203.0.113.10" }),
}));

import { forgotPassword, login } from "../auth/actions";
import { testEmailHelpers } from "../auth/email";
import prisma from "../db";
import { setRateLimiterFactoryForTests, type RateLimiter } from "../ratelimit";

const allowLimiter: RateLimiter = {
  async limit() {
    return {
      allowed: true,
      limit: 3,
      remaining: 2,
      resetAt: Date.now() + 60_000,
    };
  },
};

const blockLimiter: RateLimiter = {
  async limit() {
    return {
      allowed: false,
      limit: 3,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    };
  },
};

describe("auth rate limiting", () => {
  beforeEach(() => {
    testEmailHelpers.reset();
  });

  afterEach(() => {
    setRateLimiterFactoryForTests(null);
  });

  it("allows forgotPassword when under the limit", async () => {
    const email = `rate-ok-${randomUUID()}@example.com`;
    await prisma.user.create({
      data: { email, passwordHash: "hash" },
    });

    const identifiers: string[] = [];
    const trackingLimiter: RateLimiter = {
      async limit(identifier) {
        identifiers.push(identifier);
        return allowLimiter.limit(identifier);
      },
    };
    setRateLimiterFactoryForTests(() => trackingLimiter);

    const form = new FormData();
    form.set("email", email);
    const result = await forgotPassword(form);

    expect(result.success).toBe(true);
    const emails = testEmailHelpers.findByTo(email);
    expect(emails).toHaveLength(1);
    expect(identifiers).toEqual(expect.arrayContaining([`ip:203.0.113.10`, `email:${email}`]));
  });

  it("applies both login and loginSlow buckets on login", async () => {
    const calls: Array<{ action: string; identifier: string }> = [];
    const trackingFactory = (action: string): RateLimiter => ({
      async limit(identifier) {
        calls.push({ action, identifier });
        return allowLimiter.limit(identifier);
      },
    });
    setRateLimiterFactoryForTests((action) => trackingFactory(action));

    const form = new FormData();
    form.set("email", `login-rate-${randomUUID()}@example.com`);
    form.set("password", "password123");
    const result = await login(form);

    expect(result.success).toBe(true);
    expect(calls).toEqual(
      expect.arrayContaining([
        { action: "login", identifier: "ip:203.0.113.10" },
        { action: "loginSlow", identifier: "ip:203.0.113.10" },
      ])
    );
    expect(
      calls.some(
        (call) =>
          call.action === "login" &&
          call.identifier.startsWith("email:") &&
          call.identifier.endsWith("@example.com")
      )
    ).toBe(true);
  });

  it("blocks login when loginSlow bucket is rate limited", async () => {
    setRateLimiterFactoryForTests((action) => {
      if (action === "loginSlow") {
        return blockLimiter;
      }

      return allowLimiter;
    });

    const form = new FormData();
    form.set("email", `login-rate-block-${randomUUID()}@example.com`);
    form.set("password", "password123");
    const result = await login(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Too many");
      expect(result.retryAt).toBeTypeOf("number");
    }
  });

  it("blocks forgotPassword when rate limited", async () => {
    const email = `rate-block-${randomUUID()}@example.com`;
    await prisma.user.create({
      data: { email, passwordHash: "hash" },
    });

    setRateLimiterFactoryForTests(() => blockLimiter);

    const form = new FormData();
    form.set("email", email);
    const result = await forgotPassword(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Too many");
      expect(result.retryAt).toBeTypeOf("number");
    }

    const emails = testEmailHelpers.findByTo(email);
    expect(emails).toHaveLength(0);
  });

  it("fails closed when limiter throws and fallback is disabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_IN_MEMORY_RATE_LIMIT_FALLBACK", "false");

    const throwingLimiter: RateLimiter = {
      async limit() {
        throw new Error("Upstash unavailable");
      },
    };
    setRateLimiterFactoryForTests(() => throwingLimiter);

    const form = new FormData();
    form.set("email", `rate-error-${randomUUID()}@example.com`);
    const result = await forgotPassword(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unable to process");
    }

    vi.unstubAllEnvs();
  });
});
