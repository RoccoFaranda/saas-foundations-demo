import "server-only";
import { randomBytes, createHmac } from "node:crypto";
import prisma from "../db";
import type {
  EmailVerificationToken,
  PasswordResetToken,
  EmailChangeToken,
} from "../../generated/prisma/client";

const TOKEN_HASH_SECRET = process.env.TOKEN_HASH_SECRET;
if (!TOKEN_HASH_SECRET) {
  throw new Error("TOKEN_HASH_SECRET environment variable is not set");
}

/**
 * Generate a secure random token
 */
function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash a token using HMAC-SHA-256
 */
function hashToken(token: string): string {
  return createHmac("sha256", TOKEN_HASH_SECRET as string)
    .update(token)
    .digest("hex");
}

/**
 * Create an email verification token
 */
export async function createEmailVerificationToken(
  userId: string,
  expiresInMinutes: number = 60
): Promise<{ token: string; record: EmailVerificationToken }> {
  const token = generateToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const record = await prisma.emailVerificationToken.create({
    data: {
      userId,
      hashedToken,
      expiresAt,
    },
  });

  return { token, record };
}

/**
 * Verify and consume an email verification token
 */
export async function verifyEmailVerificationToken(
  token: string
): Promise<EmailVerificationToken | null> {
  const hashedToken = hashToken(token);
  const now = new Date();

  const { count } = await prisma.emailVerificationToken.updateMany({
    where: {
      hashedToken,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  if (count === 0) {
    return null;
  }

  return prisma.emailVerificationToken.findUnique({
    where: { hashedToken },
  });
}

/**
 * Create a password reset token
 */
export async function createPasswordResetToken(
  userId: string,
  expiresInMinutes: number = 60
): Promise<{ token: string; record: PasswordResetToken }> {
  const token = generateToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const record = await prisma.passwordResetToken.create({
    data: {
      userId,
      hashedToken,
      expiresAt,
    },
  });

  return { token, record };
}

/**
 * Verify and consume a password reset token
 */
export async function verifyPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  const hashedToken = hashToken(token);
  const now = new Date();

  const { count } = await prisma.passwordResetToken.updateMany({
    where: {
      hashedToken,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  if (count === 0) {
    return null;
  }

  return prisma.passwordResetToken.findUnique({
    where: { hashedToken },
  });
}

/**
 * Create an email change token
 */
export async function createEmailChangeToken(
  userId: string,
  newEmail: string,
  expiresInMinutes: number = 60
): Promise<{ token: string; record: EmailChangeToken }> {
  const token = generateToken();
  const hashedToken = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const record = await prisma.emailChangeToken.create({
    data: {
      userId,
      newEmail,
      hashedToken,
      expiresAt,
    },
  });

  return { token, record };
}

/**
 * Verify and consume an email change token
 */
export async function verifyEmailChangeToken(token: string): Promise<EmailChangeToken | null> {
  const hashedToken = hashToken(token);
  const now = new Date();

  const { count } = await prisma.emailChangeToken.updateMany({
    where: {
      hashedToken,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  if (count === 0) {
    return null;
  }

  return prisma.emailChangeToken.findUnique({
    where: { hashedToken },
  });
}
