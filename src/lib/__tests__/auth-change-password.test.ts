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

import { changePassword } from "../auth/actions";
import { hashPassword, verifyPassword } from "../auth/password";
import prisma from "../db";

describe("changePassword", () => {
  beforeEach(async () => {
    // no-op; db cleaned between tests by test setup
  });

  it("should update password with valid current password", async () => {
    const email = `change-pw-${randomUUID()}@example.com`;
    const oldPassword = "oldpassword123";
    const newPassword = "newpassword456";
    const oldHash = await hashPassword(oldPassword);

    const user = await prisma.user.create({
      data: { email, passwordHash: oldHash, emailVerified: new Date() },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: new Date(), sessionVersion: 0 },
    });

    const form = new FormData();
    form.set("currentPassword", oldPassword);
    form.set("newPassword", newPassword);

    const result = await changePassword(form);
    expect(result.success).toBe(true);

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated).toBeTruthy();
    if (updated) {
      const matches = await verifyPassword(newPassword, updated.passwordHash);
      expect(matches).toBe(true);
      // Old password should not work
      const oldMatches = await verifyPassword(oldPassword, updated.passwordHash);
      expect(oldMatches).toBe(false);
      expect(updated.sessionVersion).toBe((user.sessionVersion ?? 0) + 1);
    }
  });

  it("should fail with wrong current password", async () => {
    const email = `change-pw-wrong-${randomUUID()}@example.com`;
    const correctPassword = "correctpass123";
    const wrongPassword = "wrongpass123";
    const newPassword = "newpassword456";
    const correctHash = await hashPassword(correctPassword);

    const user = await prisma.user.create({
      data: { email, passwordHash: correctHash, emailVerified: new Date() },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: new Date(), sessionVersion: 0 },
    });

    const form = new FormData();
    form.set("currentPassword", wrongPassword);
    form.set("newPassword", newPassword);

    const result = await changePassword(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Current password is incorrect");
      expect(result.field).toBe("password");
    }

    // Password should not have changed
    const unchanged = await prisma.user.findUnique({ where: { id: user.id } });
    expect(unchanged).toBeTruthy();
    if (unchanged) {
      const stillMatches = await verifyPassword(correctPassword, unchanged.passwordHash);
      expect(stillMatches).toBe(true);
    }
  });

  it("should fail with invalid new password", async () => {
    const email = `change-pw-invalid-${randomUUID()}@example.com`;
    const currentPassword = "currentpass123";
    const shortPassword = "short";
    const currentHash = await hashPassword(currentPassword);

    const user = await prisma.user.create({
      data: { email, passwordHash: currentHash, emailVerified: new Date() },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: new Date(), sessionVersion: 0 },
    });

    const form = new FormData();
    form.set("currentPassword", currentPassword);
    form.set("newPassword", shortPassword);

    const result = await changePassword(form);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("at least 8 characters");
      expect(result.field).toBe("password");
    }
  });
});
