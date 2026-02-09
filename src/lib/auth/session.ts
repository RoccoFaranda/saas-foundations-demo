import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./config";
import prisma from "../db";
import type { ThemePreference } from "../../generated/prisma/enums";

/**
 * Session user type with verification status
 */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: Date | null;
  sessionVersion: number;
  themePreference?: ThemePreference | null;
}

/**
 * Get the current authenticated user from the session
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const sessionVersion =
    typeof session.user.sessionVersion === "number" ? session.user.sessionVersion : 0;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      emailVerified: true,
      sessionVersion: true,
      themePreference: true,
    },
  });

  if (!dbUser) {
    return null;
  }

  if ((dbUser.sessionVersion ?? 0) !== sessionVersion) {
    return null;
  }

  return {
    id: session.user.id,
    email: dbUser.email ?? "",
    name: dbUser.name,
    emailVerified: dbUser.emailVerified ?? null,
    sessionVersion: dbUser.sessionVersion ?? 0,
    themePreference: dbUser.themePreference ?? null,
  };
}

/**
 * Require an authenticated user
 * Redirects to login if not authenticated
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * Require an authenticated AND email-verified user
 * Redirects to login if not authenticated
 * Redirects to verify-email if authenticated but not verified
 */
export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.emailVerified) {
    redirect("/verify-email");
  }

  return user;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Check if the current user has verified their email
 */
export async function isEmailVerified(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null && user.emailVerified !== null;
}
