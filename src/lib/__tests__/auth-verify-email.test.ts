// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(),
}));

import { verifyEmail } from "../auth/actions";
import { createEmailVerificationToken } from "../auth/tokens";
import prisma from "../db";
import { setRateLimiterFactoryForTests, type RateLimiter } from "../ratelimit";

const allowLimiter: RateLimiter = {
  async limit() {
    return {
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    };
  },
};

const blockLimiter: RateLimiter = {
  async limit() {
    return {
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    };
  },
};

describe("verifyEmail", () => {
  let testUserId: string;

  beforeEach(async () => {
    setRateLimiterFactoryForTests(() => allowLimiter);

    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: `verify-test-${randomUUID()}@example.com`,
        passwordHash: "hash",
        emailVerified: null,
      },
    });
    testUserId = user.id;
  });

  afterEach(() => {
    setRateLimiterFactoryForTests(null);
  });

  it("should verify a valid token and set emailVerified", async () => {
    // Create a verification token
    const { token } = await createEmailVerificationToken(testUserId);

    // Verify the email
    const result = await verifyEmail(token);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tokenUserId).toBe(testUserId);
    }

    // Check that emailVerified was set
    const user = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { emailVerified: true },
    });

    expect(user?.emailVerified).toBeInstanceOf(Date);
  });

  it("should fail for an invalid token", async () => {
    const result = await verifyEmail("invalid-token-123");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid, expired, or already used");
    }
  });

  it("should fail for an empty token", async () => {
    const result = await verifyEmail("");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid or missing");
    }
  });

  it("should fail for an already used token", async () => {
    // Create and use a token
    const { token } = await createEmailVerificationToken(testUserId);
    await verifyEmail(token); // First use

    // Try to use it again
    const result = await verifyEmail(token);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid, expired, or already used");
    }
  });

  it("should fail for an expired token", async () => {
    // Create a token that expires immediately
    const { token } = await createEmailVerificationToken(testUserId, -1); // Negative minutes = already expired

    const result = await verifyEmail(token);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid, expired, or already used");
    }
  });

  it("should invalidate older tokens when a new token is issued", async () => {
    const { token: firstToken } = await createEmailVerificationToken(testUserId);
    const { token: secondToken } = await createEmailVerificationToken(testUserId);

    const firstResult = await verifyEmail(firstToken);
    expect(firstResult.success).toBe(false);

    const secondResult = await verifyEmail(secondToken);
    expect(secondResult.success).toBe(true);
  });

  it("should block when rate limited without consuming token", async () => {
    const { token } = await createEmailVerificationToken(testUserId);
    setRateLimiterFactoryForTests(() => blockLimiter);

    const blockedResult = await verifyEmail(token);
    expect(blockedResult.success).toBe(false);
    if (!blockedResult.success) {
      expect(blockedResult.error).toContain("Too many");
      expect(blockedResult.retryAt).toBeTypeOf("number");
    }

    setRateLimiterFactoryForTests(() => allowLimiter);
    const retryResult = await verifyEmail(token);
    expect(retryResult.success).toBe(true);
  });
});
