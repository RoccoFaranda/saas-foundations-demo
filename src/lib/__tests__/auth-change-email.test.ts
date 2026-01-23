// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";

const authMock = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: authMock,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

import { requestEmailChange, verifyEmailChange } from "../auth/actions";
import { createEmailChangeToken } from "../auth/tokens";
import { hashPassword } from "../auth/password";
import { testEmailHelpers } from "../auth/email";
import prisma from "../db";

describe("requestEmailChange", () => {
  beforeEach(() => {
    testEmailHelpers.reset();
    authMock.mockReset();
  });

  it("should send verification email for valid request", async () => {
    const oldEmail = `old-${randomUUID()}@example.com`;
    const newEmail = `new-${randomUUID()}@example.com`;
    const password = "password123";
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email: oldEmail, passwordHash, emailVerified: new Date() },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: new Date() },
    });

    const form = new FormData();
    form.set("currentPassword", password);
    form.set("newEmail", newEmail);

    const result = await requestEmailChange(form);
    expect(result.success).toBe(true);

    // Check that email was sent to new address
    const emails = testEmailHelpers.findByTo(newEmail);
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toContain("Verify your new email");
    expect(emails[0].html).toContain("/verify-email-change?token=");

    // Email should not have changed yet
    const unchanged = await prisma.user.findUnique({ where: { id: user.id } });
    expect(unchanged?.email).toBe(oldEmail);
  });

  it("should fail with wrong current password", async () => {
    const oldEmail = `old-wrong-${randomUUID()}@example.com`;
    const newEmail = `new-wrong-${randomUUID()}@example.com`;
    const correctPassword = "correctpass123";
    const wrongPassword = "wrongpass123";
    const passwordHash = await hashPassword(correctPassword);

    const user = await prisma.user.create({
      data: { email: oldEmail, passwordHash, emailVerified: new Date() },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: new Date() },
    });

    const form = new FormData();
    form.set("currentPassword", wrongPassword);
    form.set("newEmail", newEmail);

    const result = await requestEmailChange(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Current password is incorrect");
      expect(result.field).toBe("password");
    }

    // No email should be sent
    const emails = testEmailHelpers.findByTo(newEmail);
    expect(emails).toHaveLength(0);
  });

  it("should fail if new email is already in use", async () => {
    const oldEmail = `old-duplicate-${randomUUID()}@example.com`;
    const existingEmail = `existing-${randomUUID()}@example.com`;
    const password = "password123";
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email: oldEmail, passwordHash, emailVerified: new Date() },
    });

    await prisma.user.create({
      data: { email: existingEmail, passwordHash, emailVerified: new Date() },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: new Date() },
    });

    const form = new FormData();
    form.set("currentPassword", password);
    form.set("newEmail", existingEmail);

    const result = await requestEmailChange(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already exists");
      expect(result.field).toBe("email");
    }
  });

  it("should fail if new email is same as current", async () => {
    const email = `same-${randomUUID()}@example.com`;
    const password = "password123";
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, passwordHash, emailVerified: new Date() },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: new Date() },
    });

    const form = new FormData();
    form.set("currentPassword", password);
    form.set("newEmail", email);

    const result = await requestEmailChange(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("must be different");
      expect(result.field).toBe("email");
    }
  });
});

describe("verifyEmailChange", () => {
  beforeEach(() => {
    authMock.mockReset();
  });

  it("should update email with valid token", async () => {
    const oldEmail = `old-verify-${randomUUID()}@example.com`;
    const newEmail = `new-verify-${randomUUID()}@example.com`;
    const passwordHash = "hash";

    const user = await prisma.user.create({
      data: { email: oldEmail, passwordHash, emailVerified: new Date() },
    });

    const { token } = await createEmailChangeToken(user.id, newEmail);

    const result = await verifyEmailChange(token);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.tokenUserId).toBe(user.id);
    }

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.email).toBe(newEmail);
    expect(updated?.sessionVersion).toBe((user.sessionVersion ?? 0) + 1);
  });

  it("should fail for used token", async () => {
    const oldEmail = `old-used-${randomUUID()}@example.com`;
    const newEmail = `new-used-${randomUUID()}@example.com`;
    const passwordHash = "hash";

    const user = await prisma.user.create({
      data: { email: oldEmail, passwordHash, emailVerified: new Date() },
    });

    const { token } = await createEmailChangeToken(user.id, newEmail);

    const result1 = await verifyEmailChange(token);
    expect(result1.success).toBe(true);

    const result2 = await verifyEmailChange(token);
    expect(result2.success).toBe(false);
    if (!result2.success) {
      expect(result2.error).toContain("Invalid");
    }
  });

  it("should fail for expired token", async () => {
    const oldEmail = `old-expired-${randomUUID()}@example.com`;
    const newEmail = `new-expired-${randomUUID()}@example.com`;
    const passwordHash = "hash";

    const user = await prisma.user.create({
      data: { email: oldEmail, passwordHash, emailVerified: new Date() },
    });

    const { token } = await createEmailChangeToken(user.id, newEmail, -1);

    const result = await verifyEmailChange(token);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid");
    }
  });

  it("should invalidate older tokens when new one is created", async () => {
    const oldEmail = `old-invalidate-${randomUUID()}@example.com`;
    const newEmail1 = `new1-${randomUUID()}@example.com`;
    const newEmail2 = `new2-${randomUUID()}@example.com`;
    const passwordHash = "hash";

    const user = await prisma.user.create({
      data: { email: oldEmail, passwordHash, emailVerified: new Date() },
    });

    const { token: token1 } = await createEmailChangeToken(user.id, newEmail1);
    const { token: token2 } = await createEmailChangeToken(user.id, newEmail2);

    // First token should be invalid (older token invalidated)
    const result1 = await verifyEmailChange(token1);
    expect(result1.success).toBe(false);

    // Second token should work
    const result2 = await verifyEmailChange(token2);
    expect(result2.success).toBe(true);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.email).toBe(newEmail2);
  });

  it("should fail if new email is already in use (race condition)", async () => {
    const oldEmail = `old-race-${randomUUID()}@example.com`;
    const newEmail = `new-race-${randomUUID()}@example.com`;
    const passwordHash = "hash";

    const user = await prisma.user.create({
      data: { email: oldEmail, passwordHash, emailVerified: new Date() },
    });

    // Create another user with the new email
    await prisma.user.create({
      data: { email: newEmail, passwordHash, emailVerified: new Date() },
    });

    const { token } = await createEmailChangeToken(user.id, newEmail);

    const result = await verifyEmailChange(token);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("already in use");
    }

    // Original email should remain
    const unchanged = await prisma.user.findUnique({ where: { id: user.id } });
    expect(unchanged?.email).toBe(oldEmail);
  });
});
