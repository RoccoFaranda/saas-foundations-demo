// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

const authMock = vi.hoisted(() => vi.fn());
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
  default: vi.fn(() => ({
    handlers: {},
    auth: authMock,
    signIn: vi.fn(),
    signOut: signOutMock,
  })),
}));

import { requestAccountDeletion } from "../auth/actions";
import {
  createEmailChangeToken,
  createEmailVerificationToken,
  createPasswordResetToken,
} from "../auth/tokens";
import { hashPassword } from "../auth/password";
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

async function countDeletionTokens(userId: string): Promise<number> {
  return prisma.accountDeletionToken.count({
    where: { userId },
  });
}

describe("requestAccountDeletion", () => {
  beforeEach(() => {
    authMock.mockReset();
    signOutMock.mockReset();
    signOutMock.mockResolvedValue("/login?deleted=scheduled");
    testEmailHelpers.reset();
    setRateLimiterFactoryForTests(() => allowLimiter);
  });

  afterEach(() => {
    setRateLimiterFactoryForTests(null);
  });

  it("deactivates account, invalidates tokens, and signs out on success", async () => {
    const email = `delete-account-${randomUUID()}@example.com`;
    const password = "password123";
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, passwordHash, emailVerified: new Date() },
    });
    authMock.mockResolvedValue({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        sessionVersion: 0,
      },
    });

    await createEmailVerificationToken(user.id);
    await createPasswordResetToken(user.id);
    await createEmailChangeToken(user.id, `next-${randomUUID()}@example.com`);

    const form = new FormData();
    form.set("currentPassword", password);
    form.set("confirmation", "DELETE");

    const result = await requestAccountDeletion(form);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.redirectUrl).toContain("/login?deleted=scheduled");
    }

    expect(signOutMock).toHaveBeenCalledWith({
      redirect: false,
      redirectTo: "/login?deleted=scheduled",
    });

    const updatedUser = await getDeletionState(user.id);
    expect(updatedUser).toBeTruthy();
    expect(updatedUser?.deletionRequestedAt).toBeTruthy();
    expect(updatedUser?.deletionScheduledFor).toBeTruthy();
    expect(updatedUser?.sessionVersion).toBe((user.sessionVersion ?? 0) + 1);

    const activeAuthTokens = await Promise.all([
      prisma.emailVerificationToken.count({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.count({ where: { userId: user.id, usedAt: null } }),
      prisma.emailChangeToken.count({ where: { userId: user.id, usedAt: null } }),
    ]);
    expect(activeAuthTokens).toEqual([0, 0, 0]);

    expect(await countDeletionTokens(user.id)).toBe(1);

    const emails = testEmailHelpers.findByTo(email);
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toContain("Account deletion scheduled");
    expect(emails[0].preheader).toContain("scheduled for permanent deletion");
    expect(emails[0].html).toContain("/restore-account?token=");
    expect(emails[0].html).toContain("Permanent deletion date:");
    expect(emails[0].text).toContain("/restore-account?token=");
  });

  it("fails with incorrect current password", async () => {
    const email = `delete-account-wrong-pw-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: { email, passwordHash, emailVerified: new Date() },
    });
    authMock.mockResolvedValue({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        sessionVersion: 0,
      },
    });

    const form = new FormData();
    form.set("currentPassword", "wrongpassword");
    form.set("confirmation", "DELETE");

    const result = await requestAccountDeletion(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Current password is incorrect");
      expect(result.field).toBe("password");
    }

    const unchangedUser = await getDeletionState(user.id);
    expect(unchangedUser?.deletionRequestedAt).toBeNull();
    expect(unchangedUser?.deletionScheduledFor).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(await countDeletionTokens(user.id)).toBe(0);
  });

  it("fails validation when confirmation text is not DELETE", async () => {
    const email = `delete-account-confirm-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: { email, passwordHash, emailVerified: new Date() },
    });
    authMock.mockResolvedValue({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        sessionVersion: 0,
      },
    });

    const form = new FormData();
    form.set("currentPassword", "password123");
    form.set("confirmation", "delete");

    const result = await requestAccountDeletion(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Please type DELETE");
    }

    const unchangedUser = await getDeletionState(user.id);
    expect(unchangedUser?.deletionRequestedAt).toBeNull();
    expect(unchangedUser?.deletionScheduledFor).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
  });

  it("blocks and has no side effects when rate limited", async () => {
    const email = `delete-account-rate-${randomUUID()}@example.com`;
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: { email, passwordHash, emailVerified: new Date() },
    });
    authMock.mockResolvedValue({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        sessionVersion: 0,
      },
    });
    setRateLimiterFactoryForTests(() => blockLimiter);

    const form = new FormData();
    form.set("currentPassword", "password123");
    form.set("confirmation", "DELETE");

    const result = await requestAccountDeletion(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Too many");
      expect(result.retryAt).toBeTypeOf("number");
    }

    const unchangedUser = await getDeletionState(user.id);
    expect(unchangedUser?.deletionRequestedAt).toBeNull();
    expect(unchangedUser?.deletionScheduledFor).toBeNull();
    expect(await countDeletionTokens(user.id)).toBe(0);
    expect(testEmailHelpers.findByTo(email)).toHaveLength(0);
    expect(signOutMock).not.toHaveBeenCalled();
  });
});
