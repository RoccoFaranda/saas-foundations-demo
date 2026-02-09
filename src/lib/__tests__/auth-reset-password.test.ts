// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
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

import { resetPassword } from "../auth/actions";
import { createPasswordResetToken } from "../auth/tokens";
import { verifyPassword } from "../auth/password";
import prisma from "../db";

describe("resetPassword", () => {
  beforeEach(async () => {
    // no-op; db cleaned between tests by test setup
  });

  it("should reset password with valid token", async () => {
    const email = `reset-success-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: (await verifyPassword("oldpw", "invalid")) ? "x" : "hash" },
    });

    const { token } = await createPasswordResetToken(user.id);

    const form = new FormData();
    form.set("token", token);
    form.set("password", "newpassword123");

    const result = await resetPassword(form);
    expect(result.success).toBe(true);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated).toBeTruthy();
    if (updated) {
      const matches = await verifyPassword("newpassword123", updated.passwordHash);
      expect(matches).toBe(true);
      expect(updated.sessionVersion).toBe((user.sessionVersion ?? 0) + 1);
    }
  });

  it("should reject passwords over 128 characters without consuming the token", async () => {
    const email = `reset-too-long-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: "hash" },
    });

    const { token } = await createPasswordResetToken(user.id);

    const form = new FormData();
    form.set("token", token);
    form.set("password", "a".repeat(129));

    const result = await resetPassword(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("at most 128");
    }

    const retryForm = new FormData();
    retryForm.set("token", token);
    retryForm.set("password", "validpassword123");

    const retryResult = await resetPassword(retryForm);
    expect(retryResult.success).toBe(true);
  });

  it("should fail for used token", async () => {
    const email = `reset-used-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: "hash" },
    });

    const { token } = await createPasswordResetToken(user.id);

    const form1 = new FormData();
    form1.set("token", token);
    form1.set("password", "firstpass123");
    const r1 = await resetPassword(form1);
    expect(r1.success).toBe(true);

    const form2 = new FormData();
    form2.set("token", token);
    form2.set("password", "secondpass123");
    const r2 = await resetPassword(form2);
    expect(r2.success).toBe(false);
    if (!r2.success) {
      expect(r2.error).toContain("Invalid");
    }
  });

  it("should fail for expired token", async () => {
    const email = `reset-expired-${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: "hash" },
    });

    const { token } = await createPasswordResetToken(user.id, -1);

    const form = new FormData();
    form.set("token", token);
    form.set("password", "newpass123");

    const result = await resetPassword(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid");
    }
  });
});
