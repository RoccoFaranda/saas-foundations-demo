// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

const authMock = vi.hoisted(() => vi.fn());
const signInMock = vi.hoisted(() => vi.fn());
const getAppUrlMock = vi.hoisted(() => vi.fn());

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
vi.mock("../auth/urls", () => ({
  getAppUrl: getAppUrlMock,
}));

const fetchMock = vi.hoisted(() => vi.fn());
global.fetch = fetchMock;

import { signup, forgotPassword } from "../auth/actions";
import { testEmailHelpers } from "../auth/email";
import { setRateLimiterFactoryForTests } from "../ratelimit";
import prisma from "../db";

describe("app URL errors in auth actions", () => {
  beforeEach(() => {
    testEmailHelpers.reset();
    authMock.mockReset();
    signInMock.mockReset();
    fetchMock.mockReset();
    getAppUrlMock.mockReset();
    getAppUrlMock.mockImplementation(() => {
      throw new Error("app url missing");
    });
    setRateLimiterFactoryForTests(() => ({
      limit: async () => ({ allowed: true, limit: 3, remaining: 2, resetAt: Date.now() + 60000 }),
    }));
  });

  afterEach(() => {
    setRateLimiterFactoryForTests(null);
  });

  it("signup returns a safe error when app url is missing", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    signInMock.mockResolvedValueOnce("/verify-email");

    const email = `app-url-signup-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    form.set("password", "password123");
    form.set("cf-turnstile-response", "valid-token");

    const result = await signup(form);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Unable to send verification email");
    }

    const emails = testEmailHelpers.findByTo(email);
    expect(emails).toHaveLength(0);
  });

  it("forgotPassword still returns success when app url is missing", async () => {
    const email = `app-url-forgot-${randomUUID()}@example.com`;
    await prisma.user.create({
      data: { email, passwordHash: "hash" },
    });

    const form = new FormData();
    form.set("email", email);

    const result = await forgotPassword(form);

    expect(result.success).toBe(true);
    const emails = testEmailHelpers.findByTo(email);
    expect(emails).toHaveLength(0);
  });
});
