// @vitest-environment node
import "dotenv/config";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  createEmailChangeToken,
  verifyEmailChangeToken,
} from "../auth/tokens";
import prisma from "../db";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

// Test user IDs for isolation
const TEST_USER_1 = "token_test_user_001";
const TEST_USER_EMAIL_1 = "token_test1@example.com";

describe("Auth Token utilities", () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: TEST_USER_1 },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { userId: TEST_USER_1 },
    });
    await prisma.emailChangeToken.deleteMany({
      where: { userId: TEST_USER_1 },
    });

    // Delete and recreate test user
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: TEST_USER_1 }, { email: TEST_USER_EMAIL_1 }],
      },
    });

    await prisma.user.create({
      data: {
        id: TEST_USER_1,
        email: TEST_USER_EMAIL_1,
        passwordHash: "test_hash",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("EmailVerificationToken", () => {
    it("should create and verify a token", async () => {
      const { token, record } = await createEmailVerificationToken(TEST_USER_1);

      expect(token).toBeDefined();
      expect(record.userId).toBe(TEST_USER_1);
      expect(record.hashedToken).toBeDefined();
      expect(record.hashedToken).not.toBe(token); // Raw token should not be stored

      const verified = await verifyEmailVerificationToken(token);
      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(TEST_USER_1);
    });

    it("should reject expired tokens", async () => {
      const { token } = await createEmailVerificationToken(TEST_USER_1, -1); // Expired immediately

      const verified = await verifyEmailVerificationToken(token);
      expect(verified).toBeNull();
    });

    it("should reject used tokens", async () => {
      const { token } = await createEmailVerificationToken(TEST_USER_1);

      // First verification should succeed
      const firstVerify = await verifyEmailVerificationToken(token);
      expect(firstVerify).toBeDefined();

      // Second verification should fail (token already used)
      const secondVerify = await verifyEmailVerificationToken(token);
      expect(secondVerify).toBeNull();
    });

    it("should store only hashed tokens in database", async () => {
      const { token, record } = await createEmailVerificationToken(TEST_USER_1);

      // Verify the raw token is not in the database
      const dbRecord = await prisma.emailVerificationToken.findUnique({
        where: { id: record.id },
      });

      expect(dbRecord?.hashedToken).not.toBe(token);
      expect(dbRecord?.hashedToken).toHaveLength(64); // SHA-256 hex digest length
    });
  });

  describe("PasswordResetToken", () => {
    it("should create and verify a token", async () => {
      const { token, record } = await createPasswordResetToken(TEST_USER_1);

      expect(token).toBeDefined();
      expect(record.userId).toBe(TEST_USER_1);

      const verified = await verifyPasswordResetToken(token);
      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(TEST_USER_1);
    });

    it("should reject expired tokens", async () => {
      const { token } = await createPasswordResetToken(TEST_USER_1, -1);

      const verified = await verifyPasswordResetToken(token);
      expect(verified).toBeNull();
    });

    it("should reject used tokens", async () => {
      const { token } = await createPasswordResetToken(TEST_USER_1);

      await verifyPasswordResetToken(token);
      const secondVerify = await verifyPasswordResetToken(token);
      expect(secondVerify).toBeNull();
    });

    it("should invalidate older tokens when a new token is issued", async () => {
      const { token: oldToken } = await createPasswordResetToken(TEST_USER_1);
      const { token: newToken } = await createPasswordResetToken(TEST_USER_1);

      const oldVerify = await verifyPasswordResetToken(oldToken);
      expect(oldVerify).toBeNull();

      const newVerify = await verifyPasswordResetToken(newToken);
      expect(newVerify).toBeDefined();
      expect(newVerify?.userId).toBe(TEST_USER_1);
    });

    it("should store only hashed tokens in database", async () => {
      const { token, record } = await createPasswordResetToken(TEST_USER_1);

      const dbRecord = await prisma.passwordResetToken.findUnique({
        where: { id: record.id },
      });

      expect(dbRecord?.hashedToken).not.toBe(token);
      expect(dbRecord?.hashedToken).toHaveLength(64);
    });
  });

  describe("EmailChangeToken", () => {
    it("should create and verify a token", async () => {
      const newEmail = "newemail@example.com";
      const { token, record } = await createEmailChangeToken(TEST_USER_1, newEmail);

      expect(token).toBeDefined();
      expect(record.userId).toBe(TEST_USER_1);
      expect(record.newEmail).toBe(newEmail);

      const verified = await verifyEmailChangeToken(token);
      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(TEST_USER_1);
      expect(verified?.newEmail).toBe(newEmail);
    });

    it("should reject expired tokens", async () => {
      const { token } = await createEmailChangeToken(TEST_USER_1, "new@example.com", -1);

      const verified = await verifyEmailChangeToken(token);
      expect(verified).toBeNull();
    });

    it("should reject used tokens", async () => {
      const { token } = await createEmailChangeToken(TEST_USER_1, "new@example.com");

      await verifyEmailChangeToken(token);
      const secondVerify = await verifyEmailChangeToken(token);
      expect(secondVerify).toBeNull();
    });

    it("should store only hashed tokens in database", async () => {
      const { token, record } = await createEmailChangeToken(TEST_USER_1, "new@example.com");

      const dbRecord = await prisma.emailChangeToken.findUnique({
        where: { id: record.id },
      });

      expect(dbRecord?.hashedToken).not.toBe(token);
      expect(dbRecord?.hashedToken).toHaveLength(64);
    });
  });
});
