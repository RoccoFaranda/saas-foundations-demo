"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/src/lib/auth/actions";
import { AuthWordmark } from "@/src/components/auth/auth-wordmark";
import { LegalInlineLinks } from "@/src/components/legal/legal-inline-links";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

type ResetClientProps = {
  token: string | null;
  tokenValid: boolean | null;
  precheckError?: string | null;
};

export default function ResetClient({ token, tokenValid, precheckError }: ResetClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearRateLimitMessageRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  function applyRetryAt(nextRetryAt: number | null | undefined, onClearMessage?: () => void) {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    clearRateLimitMessageRef.current = onClearMessage ?? null;

    if (nextRetryAt && nextRetryAt > Date.now()) {
      setIsRateLimited(true);
      const delay = Math.max(nextRetryAt - Date.now(), 0);
      retryTimerRef.current = setTimeout(() => {
        setIsRateLimited(false);
        retryTimerRef.current = null;
        clearRateLimitMessageRef.current?.();
        clearRateLimitMessageRef.current = null;
      }, delay);
      return;
    }

    setIsRateLimited(false);
    clearRateLimitMessageRef.current?.();
    clearRateLimitMessageRef.current = null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (token) {
      formData.set("token", token);
    }

    startTransition(async () => {
      try {
        const result = await resetPassword(formData);
        if (result.success) {
          applyRetryAt(null);
          setSuccess(true);
          const redirectUrl = result.redirectUrl ?? "/login";
          // Redirect to login after short delay
          setTimeout(() => router.push(redirectUrl), 800);
        } else {
          const retryAt = result.retryAt ?? null;
          setError(result.error);
          applyRetryAt(retryAt, retryAt ? () => setError(null) : undefined);
        }
      } catch {
        applyRetryAt(null);
        setError(GENERIC_ACTION_ERROR);
      }
    });
  }

  // No token provided - show instructions
  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <AuthWordmark />
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please check your email for a password reset link.
            </p>
          </div>

          <div className="mb-4">
            <Link href="/forgot-password" className="btn-primary btn-md inline-flex">
              Send reset email
            </Link>
          </div>

          <div className="mt-6">
            <LegalInlineLinks variant="compact" />
          </div>
        </div>
      </main>
    );
  }

  // Token present but invalid
  if (tokenValid === false) {
    const isRateLimited = Boolean(precheckError);
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <AuthWordmark />
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
            <h1 className="text-2xl font-bold">
              {isRateLimited ? "Please try again shortly" : "Reset link invalid"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {precheckError ?? "This reset link is invalid, expired, or already used."}
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/forgot-password" className="btn-primary btn-md flex">
              Request a new reset email
            </Link>
            <Link href="/login" className="btn-link text-sm">
              Back to login
            </Link>
          </div>

          <div className="mt-6">
            <LegalInlineLinks variant="compact" />
          </div>
        </div>
      </main>
    );
  }

  // Token present and valid -> show form
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <AuthWordmark />
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter a new password for your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={isPending || success}
              className="form-field form-field-md"
              placeholder="********"
            />
          </div>

          {error && (
            <div className="state-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div
              className="rounded-md border border-success-border bg-success-soft px-3 py-2 text-sm text-success"
              role="status"
            >
              Password reset! Redirecting to login...
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || success || isRateLimited}
            className="btn-primary btn-md w-full"
          >
            {isPending ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <div className="mt-6">
          <LegalInlineLinks variant="compact" />
        </div>
      </div>
    </main>
  );
}
