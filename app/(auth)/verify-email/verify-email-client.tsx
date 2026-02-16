"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { verifyEmail, resendVerificationEmail } from "@/src/lib/auth/actions";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

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
  const [isResendRateLimited, setIsResendRateLimited] = useState(false);
  const [sessionRefreshError, setSessionRefreshError] = useState<string | null>(null);
  const lastVerifiedToken = useRef<string | null>(null);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRateLimitMessageRef = useRef<(() => void) | null>(null);

  const hasEmail = Boolean(email);
  const sessionUserId = session?.user?.id ?? null;
  const hasSession = Boolean(sessionUserId);
  const sessionMismatch = Boolean(tokenOwnerId && sessionUserId && tokenOwnerId !== sessionUserId);
  const refreshTriggered = useRef(false);

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) {
        clearTimeout(resendTimerRef.current);
      }
    };
  }, []);

  function applyResendRetryAt(nextRetryAt: number | null | undefined, onClearMessage?: () => void) {
    if (resendTimerRef.current) {
      clearTimeout(resendTimerRef.current);
      resendTimerRef.current = null;
    }
    clearRateLimitMessageRef.current = onClearMessage ?? null;

    if (nextRetryAt && nextRetryAt > Date.now()) {
      setIsResendRateLimited(true);
      const delay = Math.max(nextRetryAt - Date.now(), 0);
      resendTimerRef.current = setTimeout(() => {
        setIsResendRateLimited(false);
        resendTimerRef.current = null;
        clearRateLimitMessageRef.current?.();
        clearRateLimitMessageRef.current = null;
      }, delay);
      return;
    }

    setIsResendRateLimited(false);
    clearRateLimitMessageRef.current?.();
    clearRateLimitMessageRef.current = null;
  }

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
    verifyEmail(token)
      .then((result) => {
        if (result.success) {
          setVerifyState("success");
          setTokenOwnerId(result.tokenUserId ?? null);
          setSessionRefreshError(null);
        } else {
          setVerifyState("error");
          setVerifyError(result.error);
        }
      })
      .catch(() => {
        setVerifyState("error");
        setVerifyError(GENERIC_ACTION_ERROR);
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
      try {
        const result = await resendVerificationEmail();

        if (result.success) {
          setResendMessage(
            "If an account with that email exists, a verification email has been sent."
          );
          applyResendRetryAt(null);
        } else {
          const retryAt = result.retryAt ?? null;
          setResendMessage(result.error);
          applyResendRetryAt(retryAt, retryAt ? () => setResendMessage(null) : undefined);
        }
      } catch {
        applyResendRetryAt(null);
        setResendMessage(GENERIC_ACTION_ERROR);
      }
    });
  }

  // Token verification flow
  if (token) {
    if (verifyState === null) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm text-center">
            <div className="state-loading mb-8 flex-col gap-2">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-border border-t-foreground" />
              <h1 className="text-2xl font-bold text-foreground">Verifying your email...</h1>
              <p>Please wait a moment</p>
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
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
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
              <p className="mt-2 text-sm text-muted-foreground">
                Your email has been successfully verified
              </p>
            </div>

            {hasSession ? (
              <div className="space-y-3">
                {sessionMismatch ? (
                  <div className="state-info">
                    Please sign in with the verified email to continue.
                  </div>
                ) : sessionRefreshError ? (
                  <div className="state-info">{sessionRefreshError}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Redirecting you to the dashboard...
                  </p>
                )}
                <Link href="/login" className="btn-primary btn-md inline-flex">
                  Continue to login
                </Link>
              </div>
            ) : (
              <Link href="/login" className="btn-primary btn-md inline-flex">
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
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
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
              <p className="mt-2 text-sm text-muted-foreground">{verifyError}</p>
            </div>

            {hasSession ? (
              <div className="space-y-3">
                <Link href="/verify-email" className="btn-primary btn-md flex">
                  Go to resend
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <Link href="/login?callbackUrl=/verify-email" className="btn-primary btn-md flex">
                  Sign in to resend
                </Link>
                <Link href="/login" className="btn-link text-sm">
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
          <p className="mt-2 text-sm text-muted-foreground">
            Please check your inbox for a verification link
          </p>
        </div>

        <div className="state-info mb-6 px-4 py-3">
          <p className="text-muted-foreground">
            We&apos;ve sent you an email with a verification link. Click the link to activate your
            account.
          </p>
        </div>

        <div className="mb-4 text-center text-sm text-muted-foreground">
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
                maxLength={255}
                disabled
                readOnly
                value={email ?? ""}
                className="form-field form-field-md"
              />
            </div>

            {resendMessage && (
              <div className="state-info" role="status">
                {resendMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={resendPending || isResendRateLimited}
              className="btn-primary btn-md w-full"
            >
              {resendPending ? "Sending..." : "Resend verification email"}
            </button>
          </form>
        ) : (
          <div className="state-info">
            <p>Sign in to resend your verification email.</p>
          </div>
        )}

        {!hasEmail && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
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
