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

import { forgotPassword } from "../auth/actions";
import { testEmailHelpers } from "../auth/email";
import prisma from "../db";

describe("forgotPassword", () => {
  beforeEach(() => {
    testEmailHelpers.reset();
  });

  it("should return generic success and send email for existing user", async () => {
    const email = `forgot-test-${randomUUID()}@example.com`;
    await prisma.user.create({
      data: { email, passwordHash: "hash" },
    });

    const form = new FormData();
    form.set("email", email);
    const result = await forgotPassword(form);

    expect(result.success).toBe(true);

    const emails = testEmailHelpers.findByTo(email);
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toContain("Reset your password");
    expect(emails[0].html).toContain("/reset-password?token=");
  });

  it("should return generic success and not send email for unknown user", async () => {
    const email = `no-user-${randomUUID()}@example.com`;
    const form = new FormData();
    form.set("email", email);
    const result = await forgotPassword(form);

    expect(result.success).toBe(true);

    const emails = testEmailHelpers.findByTo(email);
    expect(emails).toHaveLength(0);
  });
});
