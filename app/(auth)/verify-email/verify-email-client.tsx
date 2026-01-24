"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { verifyEmail, resendVerificationEmail } from "@/src/lib/auth/actions";

type VerifyState = "success" | "error";

type VerifyEmailClientProps = {
  token: string | null;
  email: string | null;
};

export default function VerifyEmailClient({ token, email }: VerifyEmailClientProps) {
  const router = useRouter();
  const { update, data: session } = useSession();
  const [verifyState, setVerifyState] = useState<VerifyState | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [tokenOwnerId, setTokenOwnerId] = useState<string | null>(null);

  const [resendPending, startResendTransition] = useTransition();
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [sessionRefreshError, setSessionRefreshError] = useState<string | null>(null);
  const lastVerifiedToken = useRef<string | null>(null);

  const hasEmail = Boolean(email);
  const sessionUserId = session?.user?.id ?? null;
  const hasSession = Boolean(sessionUserId);
  const sessionMismatch = Boolean(tokenOwnerId && sessionUserId && tokenOwnerId !== sessionUserId);
  const refreshTriggered = useRef(false);

  // Auto-verify if token is present
  useEffect(() => {
    if (!token) {
      return;
    }

    if (lastVerifiedToken.current === token) {
      return;
    }

    lastVerifiedToken.current = token;
    refreshTriggered.current = false;
    verifyEmail(token).then((result) => {
      if (result.success) {
        setVerifyState("success");
        setTokenOwnerId(result.tokenUserId ?? null);
        setSessionRefreshError(null);
      } else {
        setVerifyState("error");
        setVerifyError(result.error);
      }
    });
  }, [token, sessionUserId]);

  useEffect(() => {
    if (verifyState !== "success" || !hasSession || refreshTriggered.current) {
      return;
    }

    if (!sessionUserId) {
      return;
    }

    if (sessionMismatch) {
      refreshTriggered.current = true;
      void signOut({ redirect: false });
      return;
    }

    refreshTriggered.current = true;
    void update({ refresh: true })
      .then(() => {
        router.replace("/app/dashboard");
      })
      .catch(() => {
        setSessionRefreshError("Please sign in again to continue.");
      });
  }, [verifyState, hasSession, update, router, sessionUserId, tokenOwnerId, sessionMismatch]);

  function handleResendSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResendMessage(null);

    startResendTransition(async () => {
      const result = await resendVerificationEmail();

      if (result.success) {
        setResendMessage(
          "If an account with that email exists, a verification email has been sent."
        );
      } else {
        setResendMessage(result.error);
      }
    });
  }

  // Token verification flow
  if (token) {
    if (verifyState === null) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm text-center">
            <div className="mb-8">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-foreground/20 border-t-foreground" />
              <h1 className="text-2xl font-bold">Verifying your email...</h1>
              <p className="mt-2 text-sm text-foreground/60">Please wait a moment</p>
            </div>
          </div>
        </main>
      );
    }

    if (verifyState === "success") {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm text-center">
            <div className="mb-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold">Email verified!</h1>
              <p className="mt-2 text-sm text-foreground/60">
                Your email has been successfully verified
              </p>
            </div>

            {hasSession ? (
              <div className="space-y-3">
                {sessionMismatch ? (
                  <div className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground/80">
                    Please sign in with the verified email to continue.
                  </div>
                ) : sessionRefreshError ? (
                  <div className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground/80">
                    {sessionRefreshError}
                  </div>
                ) : (
                  <p className="text-sm text-foreground/60">Redirecting you to the dashboard...</p>
                )}
                <Link
                  href="/login"
                  className="inline-block rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2"
                >
                  Continue to login
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-block rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2"
              >
                Continue to login
              </Link>
            )}
          </div>
        </main>
      );
    }

    if (verifyState === "error") {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm text-center">
            <div className="mb-8">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold">Verification failed</h1>
              <p className="mt-2 text-sm text-foreground/60">{verifyError}</p>
            </div>

            {hasSession ? (
              <div className="space-y-3">
                <Link
                  href="/verify-email"
                  className="block rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2"
                >
                  Go to resend
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  href="/login?callbackUrl=/verify-email"
                  className="block rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2"
                >
                  Sign in to resend
                </Link>
                <Link
                  href="/login"
                  className="block text-sm text-foreground/60 hover:text-foreground hover:underline"
                >
                  Back to login
                </Link>
              </div>
            )}
          </div>
        </main>
      );
    }
  }

  // Holding screen with resend form (no token)
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Verify your email</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Please check your inbox for a verification link
          </p>
        </div>

        <div className="mb-6 rounded-md border border-foreground/20 bg-background px-4 py-3 text-sm">
          <p className="text-foreground/80">
            We&apos;ve sent you an email with a verification link. Click the link to activate your
            account.
          </p>
        </div>

        <div className="mb-4 text-center text-sm text-foreground/60">
          Didn&apos;t receive the email?
        </div>

        {hasEmail ? (
          <form onSubmit={handleResendSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled
                readOnly
                value={email ?? ""}
                className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {resendMessage && (
              <div
                className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground/80"
                role="status"
              >
                {resendMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={resendPending}
              className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendPending ? "Sending..." : "Resend verification email"}
            </button>
          </form>
        ) : (
          <div className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground/80">
            <p>Sign in to resend your verification email.</p>
          </div>
        )}

        {!hasEmail && (
          <p className="mt-4 text-center text-sm text-foreground/60">
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        )}

        <p className="mt-6 text-center text-sm text-foreground/60">
          Wrong email?{" "}
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/signup" })}
            className="font-medium text-foreground hover:underline"
          >
            Create a new account
          </button>
        </p>
      </div>
    </main>
  );
}
