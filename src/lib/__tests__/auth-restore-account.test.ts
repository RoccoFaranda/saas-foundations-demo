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

import { restoreAccount } from "../auth/actions";
import { createAccountDeletionToken } from "../auth/tokens";
import { hashPassword } from "../auth/password";
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

async function scheduleDeletion(userId: string): Promise<void> {
  const now = new Date();
  const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletionRequestedAt: now,
      deletionScheduledFor: scheduledFor,
    },
  });
}

async function getDeletionState(userId: string): Promise<{
  deletionRequestedAt: Date | null;
  deletionScheduledFor: Date | null;
  sessionVersion: number;
} | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      deletionRequestedAt: true,
      deletionScheduledFor: true,
      sessionVersion: true,
    },
  });
}

describe("restoreAccount", () => {
  beforeEach(() => {
    setRateLimiterFactoryForTests(() => allowLimiter);
  });

  afterEach(() => {
    setRateLimiterFactoryForTests(null);
  });

  it("restores a pending-deletion account with a valid token", async () => {
    const email = `restore-account-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("password123"),
        emailVerified: new Date(),
      },
    });
    await scheduleDeletion(user.id);

    const { token } = await createAccountDeletionToken(
      user.id,
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );

    const result = await restoreAccount(token);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.redirectUrl).toBe("/login?restored=success");
    }

    const updatedUser = await getDeletionState(user.id);
    expect(updatedUser?.deletionRequestedAt).toBeNull();
    expect(updatedUser?.deletionScheduledFor).toBeNull();
    expect(updatedUser?.sessionVersion).toBe((user.sessionVersion ?? 0) + 1);
  });

  it("rejects invalid or already-used restore tokens", async () => {
    const email = `restore-account-used-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("password123"),
        emailVerified: new Date(),
      },
    });
    await scheduleDeletion(user.id);

    const { token } = await createAccountDeletionToken(
      user.id,
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );

    const first = await restoreAccount(token);
    expect(first.success).toBe(true);

    const second = await restoreAccount(token);
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toContain("Invalid");
    }
  });

  it("does not consume restore token when restore flow is rate limited", async () => {
    const email = `restore-account-rate-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword("password123"),
        emailVerified: new Date(),
      },
    });
    await scheduleDeletion(user.id);

    const { token } = await createAccountDeletionToken(
      user.id,
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );

    setRateLimiterFactoryForTests(() => blockLimiter);
    const blocked = await restoreAccount(token);
    expect(blocked.success).toBe(false);
    if (!blocked.success) {
      expect(blocked.error).toContain("Too many");
      expect(blocked.retryAt).toBeTypeOf("number");
    }

    setRateLimiterFactoryForTests(() => allowLimiter);
    const retry = await restoreAccount(token);
    expect(retry.success).toBe(true);
  });
});
