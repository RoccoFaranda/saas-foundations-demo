"use server";

import prisma from "../db";
import {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  changeEmailSchema,
} from "../validation/auth";
import { hashPassword, verifyPassword } from "./password";
import {
  createEmailVerificationToken,
  verifyEmailVerificationToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  createEmailChangeToken,
  verifyEmailChangeToken,
} from "./tokens";
import { getEmailAdapter } from "./email";
import { signIn, signOut } from "./config";
import { AuthError } from "next-auth";
import { logAuthEvent } from "./logging";
import { getCurrentUser, requireVerifiedUser } from "./session";
import {
  AUTH_RATE_LIMIT_ERROR,
  formatRateLimitMessage,
  getAuthRateLimiter,
  type AuthRateLimitAction,
} from "../ratelimit";
import { headers } from "next/headers";
import { verifyTurnstileToken } from "./turnstile";

/**
 * Action result type for auth actions
 */
export type AuthActionResult =
  | { success: true; redirectUrl?: string; tokenUserId?: string }
  | { success: false; error: string; field?: "email" | "password"; retryAt?: number };

const DEFAULT_LOGIN_REDIRECT = "/app/dashboard";

async function enforceAuthRateLimit(
  action: AuthRateLimitAction,
  identifiers: string[]
): Promise<AuthActionResult | null> {
  const limiter = getAuthRateLimiter(action);
  for (const identifier of identifiers) {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      continue;
    }

    const result = await limiter.limit(normalizedIdentifier);
    if (!result.allowed) {
      const message = result.resetAt
        ? formatRateLimitMessage(result.resetAt)
        : AUTH_RATE_LIMIT_ERROR;
      return { success: false, error: message, retryAt: result.resetAt };
    }
  }

  return null;
}

async function getRequestIp(): Promise<string | null> {
  try {
    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const realIp = requestHeaders.get("x-real-ip");
    const source = forwardedFor ?? realIp;
    if (!source) {
      return null;
    }
    const [first] = source.split(",");
    return first?.trim() ?? null;
  } catch {
    return null;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

function sanitizeCallbackUrl(input: unknown, fallback: string): string {
  if (typeof input !== "string") {
    return fallback;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }

  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") ? fallback : trimmed;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const base = new URL(baseUrl);
    const target = new URL(trimmed, base);
    if (target.origin === base.origin) {
      return `${target.pathname}${target.search}${target.hash}`;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function hasAuthError(url: string): boolean {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const parsed = new URL(url, baseUrl);
    return parsed.searchParams.has("error");
  } catch {
    return true;
  }
}

function toPathWithSearch(url: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const parsed = new URL(url, baseUrl);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * Generate verification email HTML
 * Note: Does NOT include raw token in logs
 */
function generateVerificationEmailHtml(verifyUrl: string): string {
  return `
    <h1>Verify your email</h1>
    <p>Click the link below to verify your email address:</p>
    <p><a href="${verifyUrl}">Verify Email</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't create an account, you can ignore this email.</p>
  `;
}

/**
 * Signup action
 * Creates a new user, sends verification email
 */
export async function signup(formData: FormData): Promise<AuthActionResult> {
  const rawEmail = formData.get("email");
  const emailIdentifier = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const requestIp = await getRequestIp();
  const signupRateLimit = await enforceAuthRateLimit("signup", [
    requestIp ? `ip:${requestIp}` : "",
    emailIdentifier ? `email:${emailIdentifier}` : "",
  ]);
  if (signupRateLimit) {
    return signupRateLimit;
  }

  // Verify Turnstile token
  const turnstileToken = formData.get("cf-turnstile-response");
  const isTurnstileValid = await verifyTurnstileToken(
    typeof turnstileToken === "string" ? turnstileToken : null
  );
  if (!isTurnstileValid) {
    logAuthEvent("signup_turnstile_failed");
    return {
      success: false,
      error: "Verification failed. Please try again.",
    };
  }

  // Parse and validate input
  const rawInput = {
    email: rawEmail,
    password: formData.get("password"),
  };

  const parsed = signupSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path[0] as "email" | "password" | undefined;
    logAuthEvent("signup_validation_failed", { field: field ?? null });
    return { success: false, error: firstIssue?.message ?? "Invalid input", field };
  }

  const { email, password } = parsed.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    // Surface specific message for better UX (allows enumeration).
    logAuthEvent("signup_duplicate");
    return {
      success: false,
      error: "An account with this email already exists. Please sign in instead.",
      field: "email",
    };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      logAuthEvent("signup_duplicate");
      return {
        success: false,
        error: "An account with this email already exists. Please sign in instead.",
        field: "email",
      };
    }
    throw error;
  }

  // Create verification token
  const { token } = await createEmailVerificationToken(user.id);
  logAuthEvent("signup_created", { userId: user.id });

  // Build verification URL (token is safe to include in URL, not logged)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  // Send verification email
  const emailAdapter = getEmailAdapter();
  await emailAdapter.send({
    to: email,
    subject: "Verify your email - SaaS Foundations Demo",
    html: generateVerificationEmailHtml(verifyUrl),
    text: `Verify your email by visiting: ${verifyUrl}`,
  });
  logAuthEvent("signup_verification_email_sent", { userId: user.id });

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/verify-email",
    });

    if (typeof result === "string" && hasAuthError(result)) {
      logAuthEvent("signup_auto_login_failed", { userId: user.id });
      return { success: false, error: "Unable to sign in. Please log in." };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      logAuthEvent("signup_auto_login_failed", { userId: user.id });
      return { success: false, error: "Unable to sign in. Please log in." };
    }
    throw error;
  }

  return { success: true };
}

/**
 * Login action
 * Authenticates user via Auth.js credentials
 */
export async function login(formData: FormData): Promise<AuthActionResult> {
  const rawEmail = formData.get("email");
  const emailIdentifier = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const requestIp = await getRequestIp();
  const loginRateLimit = await enforceAuthRateLimit("login", [
    requestIp ? `ip:${requestIp}` : "",
    emailIdentifier ? `email:${emailIdentifier}` : "",
  ]);
  if (loginRateLimit) {
    return loginRateLimit;
  }

  // Parse and validate input
  const rawInput = {
    email: rawEmail,
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const field = firstIssue?.path[0] as "email" | "password" | undefined;
    logAuthEvent("login_validation_failed", { field: field ?? null });
    return { success: false, error: firstIssue?.message ?? "Invalid input", field };
  }

  const { email, password } = parsed.data;
  const callbackUrl = sanitizeCallbackUrl(formData.get("callbackUrl"), DEFAULT_LOGIN_REDIRECT);

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: callbackUrl,
    });

    if (typeof result === "string" && hasAuthError(result)) {
      logAuthEvent("login_invalid_credentials");
      return { success: false, error: "Invalid email or password" };
    }

    const redirectUrl = typeof result === "string" ? toPathWithSearch(result) : callbackUrl;
    logAuthEvent("login_success");
    return { success: true, redirectUrl };
  } catch (error) {
    if (error instanceof AuthError) {
      // Generic error message to prevent enumeration
      logAuthEvent("login_invalid_credentials");
      return { success: false, error: "Invalid email or password" };
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Verify email action
 * Consumes token and sets emailVerified timestamp
 */
export async function verifyEmail(token: string): Promise<AuthActionResult> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    logAuthEvent("verify_email_invalid_token");
    return { success: false, error: "Invalid or missing verification token" };
  }

  // Verify and consume the token
  const tokenRecord = await verifyEmailVerificationToken(token);

  if (!tokenRecord) {
    logAuthEvent("verify_email_token_invalid");
    return {
      success: false,
      error: "Invalid, expired, or already used verification token",
    };
  }

  // Set emailVerified on the user and invalidate other sessions
  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: { emailVerified: new Date(), sessionVersion: { increment: 1 } },
  });

  logAuthEvent("verify_email_success", { userId: tokenRecord.userId });
  return { success: true, tokenUserId: tokenRecord.userId };
}

/**
 * Generate password reset email HTML
 */
function generateResetEmailHtml(resetUrl: string): string {
  return `
    <h1>Reset your password</h1>
    <p>Click the link below to reset your password:</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, you can ignore this email.</p>
  `;
}

/**
 * Forgot password action
 * Always returns success to avoid account enumeration.
 * If the user exists, creates a password reset token and sends an email.
 */
export async function forgotPassword(formData: FormData): Promise<AuthActionResult> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const requestIp = await getRequestIp();
  const forgotRateLimit = await enforceAuthRateLimit("forgotPassword", [
    requestIp ? `ip:${requestIp}` : "",
    email ? `email:${email}` : "",
  ]);
  if (forgotRateLimit) {
    return forgotRateLimit;
  }

  if (!email) {
    logAuthEvent("forgot_password_validation_failed");
    // Return generic success
    return { success: true };
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (user) {
    try {
      const { token } = await createPasswordResetToken(user.id);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      const emailAdapter = getEmailAdapter();
      await emailAdapter.send({
        to: user.email,
        subject: "Reset your password - SaaS Foundations Demo",
        html: generateResetEmailHtml(resetUrl),
        text: `Reset your password by visiting: ${resetUrl}`,
      });
      logAuthEvent("forgot_password_email_sent", { userId: user.id });
    } catch (err) {
      // Don't surface errors to caller; log and continue returning generic success
      logAuthEvent("forgot_password_email_error", { email, error: String(err) });
    }
  } else {
    logAuthEvent("forgot_password_noop", { email });
  }

  return { success: true };
}

/**
 * Reset password action
 * Consumes a password reset token and updates the user's password.
 */
export async function resetPassword(formData: FormData): Promise<AuthActionResult> {
  const rawToken = formData.get("token");
  const rawPassword = formData.get("password");
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";

  if (!token) {
    logAuthEvent("reset_password_missing_token");
    return { success: false, error: "Invalid or missing reset token" };
  }

  if (!password || password.length < 8) {
    logAuthEvent("reset_password_invalid_password");
    return { success: false, error: "Password must be at least 8 characters", field: "password" };
  }

  // Consume and verify the token
  const tokenRecord = await verifyPasswordResetToken(token);

  if (!tokenRecord) {
    logAuthEvent("reset_password_token_invalid");
    return { success: false, error: "Invalid, expired, or already used reset token" };
  }

  // Update user's password
  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  });

  logAuthEvent("reset_password_success", { userId: tokenRecord.userId });
  const signOutUrl = await signOut({ redirect: false, redirectTo: "/login?reset=success" });
  const redirectUrl =
    typeof signOutUrl === "string" ? toPathWithSearch(signOutUrl) : "/login?reset=success";
  return { success: true, redirectUrl };
}

/**
 * Resend verification email action
 * Returns generic success to prevent account enumeration
 */
export async function resendVerificationEmail(): Promise<AuthActionResult> {
  const sessionUser = await getCurrentUser();
  const sessionEmail = sessionUser?.email ?? null;
  if (!sessionUser?.id || !sessionEmail) {
    logAuthEvent("resend_verification_validation_failed");
    return { success: false, error: "Please sign in to resend verification email." };
  }

  const requestIp = await getRequestIp();
  const resendRateLimit = await enforceAuthRateLimit("resendVerificationEmail", [
    `user:${sessionUser.id}`,
    requestIp ? `ip:${requestIp}` : "",
  ]);
  if (resendRateLimit) {
    return resendRateLimit;
  }

  // Find user (if exists)
  const user = await prisma.user.findUnique({
    where: { email: sessionEmail },
    select: { id: true, email: true, emailVerified: true },
  });

  // Always return success to prevent account enumeration
  // But only send email if user exists and isn't already verified
  if (user && !user.emailVerified) {
    const { token } = await createEmailVerificationToken(user.id);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    const emailAdapter = getEmailAdapter();
    await emailAdapter.send({
      to: user.email,
      subject: "Verify your email - SaaS Foundations Demo",
      html: generateVerificationEmailHtml(verifyUrl),
      text: `Verify your email by visiting: ${verifyUrl}`,
    });

    logAuthEvent("resend_verification_sent", { userId: user.id });
  } else {
    // Log but don't reveal whether user exists or is already verified
    logAuthEvent("resend_verification_noop");
  }

  return { success: true };
}

/**
 * Generate email change verification email HTML
 */
function generateEmailChangeHtml(verifyUrl: string, newEmail: string): string {
  return `
    <h1>Verify your new email address</h1>
    <p>You requested to change your email address to: <strong>${newEmail}</strong></p>
    <p>Click the link below to verify and complete the change:</p>
    <p><a href="${verifyUrl}">Verify new email</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this change, you can ignore this email.</p>
  `;
}

/**
 * Change password action
 * Requires authenticated and verified user
 */
export async function changePassword(formData: FormData): Promise<AuthActionResult> {
  const user = await requireVerifiedUser();

  const rawInput = {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  };

  const parsed = changePasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    logAuthEvent("change_password_validation_failed");
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid input",
      field: "password",
    };
  }

  const { currentPassword, newPassword } = parsed.data;

  // Get user with password hash
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!userRecord) {
    logAuthEvent("change_password_invalid_current");
    return { success: false, error: "User not found", field: "password" };
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, userRecord.passwordHash);
  if (!isCurrentPasswordValid) {
    logAuthEvent("change_password_invalid_current");
    return { success: false, error: "Current password is incorrect", field: "password" };
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      sessionVersion: { increment: 1 },
    },
  });

  logAuthEvent("change_password_success", { userId: user.id });
  return { success: true };
}

/**
 * Request email change action
 * Requires authenticated and verified user
 * Sends verification email to new address
 */
export async function requestEmailChange(formData: FormData): Promise<AuthActionResult> {
  const user = await requireVerifiedUser();

  const rawInput = {
    currentPassword: formData.get("currentPassword"),
    newEmail: formData.get("newEmail"),
  };

  const parsed = changeEmailSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    logAuthEvent("change_email_validation_failed");
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid input",
      field: firstIssue?.path[0] === "newEmail" ? "email" : "password",
    };
  }

  const { currentPassword, newEmail } = parsed.data;

  // Check if new email is same as current
  if (newEmail === user.email) {
    logAuthEvent("change_email_validation_failed");
    return {
      success: false,
      error: "New email must be different from current email",
      field: "email",
    };
  }

  // Get user with password hash
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!userRecord) {
    logAuthEvent("change_email_invalid_current_password");
    return { success: false, error: "User not found", field: "password" };
  }

  // Verify current password
  const isCurrentPasswordValid = await verifyPassword(currentPassword, userRecord.passwordHash);
  if (!isCurrentPasswordValid) {
    logAuthEvent("change_email_invalid_current_password");
    return { success: false, error: "Current password is incorrect", field: "password" };
  }

  // Check if new email is already in use
  const existingUser = await prisma.user.findUnique({
    where: { email: newEmail },
    select: { id: true },
  });

  if (existingUser) {
    logAuthEvent("change_email_duplicate", { userId: user.id });
    return {
      success: false,
      error: "An account with this email already exists",
      field: "email",
    };
  }

  // Create email change token
  const { token } = await createEmailChangeToken(user.id, newEmail);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify-email-change?token=${token}`;

  // Send verification email to new address
  const emailAdapter = getEmailAdapter();
  await emailAdapter.send({
    to: newEmail,
    subject: "Verify your new email - SaaS Foundations Demo",
    html: generateEmailChangeHtml(verifyUrl, newEmail),
    text: `Verify your new email by visiting: ${verifyUrl}`,
  });

  logAuthEvent("change_email_token_sent", { userId: user.id });
  return { success: true };
}

/**
 * Verify email change action
 * Consumes token and updates user email
 */
export async function verifyEmailChange(token: string): Promise<AuthActionResult> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    logAuthEvent("change_email_token_invalid");
    return { success: false, error: "Invalid or missing verification token" };
  }

  // Verify and consume the token
  const tokenRecord = await verifyEmailChangeToken(token);

  if (!tokenRecord) {
    logAuthEvent("change_email_token_invalid");
    return {
      success: false,
      error: "Invalid, expired, or already used verification token",
    };
  }

  // Check if new email is still available (race condition protection)
  const existingUser = await prisma.user.findUnique({
    where: { email: tokenRecord.newEmail },
    select: { id: true },
  });

  if (existingUser) {
    logAuthEvent("change_email_duplicate", { userId: tokenRecord.userId });
    return {
      success: false,
      error: "This email address is already in use",
      field: "email",
    };
  }

  // Update user email
  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: {
      email: tokenRecord.newEmail,
      sessionVersion: { increment: 1 },
    },
  });

  logAuthEvent("change_email_success", { userId: tokenRecord.userId });
  return { success: true, tokenUserId: tokenRecord.userId };
}

/**
 * Sign out current user (server action)
 */
