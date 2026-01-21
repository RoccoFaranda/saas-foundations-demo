"use server";

import prisma from "../db";
import { signupSchema, loginSchema } from "../validation/auth";
import { hashPassword } from "./password";
import { createEmailVerificationToken, verifyEmailVerificationToken } from "./tokens";
import { getEmailAdapter } from "./email";
import { signIn, auth } from "./config";
import { AuthError } from "next-auth";
import { logAuthEvent } from "./logging";

/**
 * Action result type for auth actions
 */
export type AuthActionResult =
  | { success: true; redirectUrl?: string }
  | { success: false; error: string; field?: "email" | "password" };

const DEFAULT_LOGIN_REDIRECT = "/app/dashboard";

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
  // Parse and validate input
  const rawInput = {
    email: formData.get("email"),
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
    // Return generic error to prevent account enumeration
    logAuthEvent("signup_duplicate");
    return { success: false, error: "Unable to create account. Please try again.", field: "email" };
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
        error: "Unable to create account. Please try again.",
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
  // Parse and validate input
  const rawInput = {
    email: formData.get("email"),
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

  // Set emailVerified on the user
  await prisma.user.update({
    where: { id: tokenRecord.userId },
    data: { emailVerified: new Date() },
  });

  logAuthEvent("verify_email_success", { userId: tokenRecord.userId });
  return { success: true };
}

/**
 * Resend verification email action
 * Returns generic success to prevent account enumeration
 */
export async function resendVerificationEmail(): Promise<AuthActionResult> {
  const session = await auth();
  const sessionEmail = session?.user?.email ?? null;
  if (!sessionEmail) {
    logAuthEvent("resend_verification_validation_failed");
    return { success: false, error: "Please sign in to resend verification email." };
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
 * Sign out current user (server action)
 */
