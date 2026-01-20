import "server-only";
import { redirect } from "next/navigation";
import { auth } from "./config";

/**
 * Session user type with verification status
 */
export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: Date | null;
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

  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    emailVerified: session.user.emailVerified ?? null,
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
