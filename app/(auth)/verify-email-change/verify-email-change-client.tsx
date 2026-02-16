"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { verifyEmailChange } from "@/src/lib/auth/actions";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

type VerifyEmailChangeClientProps = {
  token: string | null;
};

export default function VerifyEmailChangeClient({ token }: VerifyEmailChangeClientProps) {
  const router = useRouter();
  const { update, data: session } = useSession();
  const [verifyState, setVerifyState] = useState<"success" | "error" | null>(
    token ? null : "error"
  );
  const [verifyError, setVerifyError] = useState<string | null>(
    token ? null : "Missing verification token"
  );
  const [tokenOwnerId, setTokenOwnerId] = useState<string | null>(null);
  const [sessionRefreshError, setSessionRefreshError] = useState<string | null>(null);
  const lastVerifiedToken = useRef<string | null>(null);
  const refreshTriggered = useRef(false);
  const sessionUserId = session?.user?.id ?? null;
  const hasSession = Boolean(sessionUserId);
  const sessionMismatch = Boolean(tokenOwnerId && sessionUserId && tokenOwnerId !== sessionUserId);

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

    verifyEmailChange(token)
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
        router.replace("/app/settings");
      })
      .catch(() => {
        setSessionRefreshError("Please sign in again to continue.");
      });
  }, [verifyState, hasSession, update, router, sessionUserId, tokenOwnerId, sessionMismatch]);

  if (verifyState === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="state-loading mb-8 flex-col gap-2">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-border border-t-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Verifying email change...</h1>
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
            <h1 className="text-2xl font-bold">Email changed!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your email address has been successfully updated
            </p>
          </div>

          {hasSession ? (
            <div className="space-y-3">
              {sessionMismatch ? (
                <div className="state-info">Please sign in with the updated email to continue.</div>
              ) : sessionRefreshError ? (
                <div className="state-info">{sessionRefreshError}</div>
              ) : (
                <p className="text-sm text-muted-foreground">Redirecting you to settings...</p>
              )}
              {sessionMismatch ? (
                <Link href="/login" className="btn-primary btn-md inline-flex">
                  Sign in
                </Link>
              ) : (
                <Link href="/app/settings" className="btn-primary btn-md inline-flex">
                  Continue to settings
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please sign in again with your new email address.
              </p>
              <Link href="/login" className="btn-primary btn-md inline-flex">
                Sign in
              </Link>
            </div>
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
              <Link href="/app/settings/change-email" className="btn-primary btn-md flex">
                Request a new verification email
              </Link>
              <Link href="/app/settings" className="btn-link text-sm">
                Back to settings
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <Link href="/login" className="btn-primary btn-md flex">
                Sign in to request a new email
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

  return null;
}
