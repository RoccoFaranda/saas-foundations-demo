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
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(),
}));

import { resendVerificationEmail } from "../auth/actions";
import { testEmailHelpers } from "../auth/email";
import prisma from "../db";

describe("resendVerificationEmail", () => {
  beforeEach(() => {
    testEmailHelpers.reset();
    authMock.mockReset();
  });

  it("should return success for an existing unverified user", async () => {
    // Create an unverified user
    const user = await prisma.user.create({
      data: {
        email: `resend-test-${randomUUID()}@example.com`,
        passwordHash: "hash",
        emailVerified: null,
      },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: null, sessionVersion: 0 },
    });
    const result = await resendVerificationEmail();

    expect(result.success).toBe(true);

    // Check that an email was sent
    const emails = testEmailHelpers.findByTo(user.email);
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toContain("Verify your email");
  });

  it("should fail when session user no longer exists", async () => {
    authMock.mockResolvedValue({
      user: { id: "missing-user", email: "missing@example.com", sessionVersion: 0 },
    });
    const result = await resendVerificationEmail();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Please sign in");
    }
  });

  it("should return success for an already verified user (no enumeration)", async () => {
    // Create a verified user
    const user = await prisma.user.create({
      data: {
        email: `verified-test-${randomUUID()}@example.com`,
        passwordHash: "hash",
        emailVerified: new Date(),
      },
    });

    authMock.mockResolvedValue({
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        sessionVersion: 0,
      },
    });
    const result = await resendVerificationEmail();

    // Should succeed to prevent enumeration
    expect(result.success).toBe(true);

    // No email should be sent (already verified)
    const emails = testEmailHelpers.findByTo(user.email);
    expect(emails).toHaveLength(0);
  });

  it("should fail when no session email is available", async () => {
    authMock.mockResolvedValue(null);
    const result = await resendVerificationEmail();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Please sign in");
    }
  });

  it("should include verification token in email", async () => {
    // Create an unverified user
    const user = await prisma.user.create({
      data: {
        email: `token-test-${randomUUID()}@example.com`,
        passwordHash: "hash",
        emailVerified: null,
      },
    });

    authMock.mockResolvedValue({
      user: { id: user.id, email: user.email, emailVerified: null, sessionVersion: 0 },
    });
    await resendVerificationEmail();

    const emails = testEmailHelpers.findByTo(user.email);
    expect(emails).toHaveLength(1);

    // Verify the email contains a verification link
    const emailHtml = emails[0].html;
    expect(emailHtml).toContain("/verify-email?token=");
  });
});
