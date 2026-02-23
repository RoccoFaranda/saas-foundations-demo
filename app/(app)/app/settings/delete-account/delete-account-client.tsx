"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestAccountDeletion } from "@/src/lib/auth/actions";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

type DeleteAccountClientProps = {
  graceDays: number;
};

export default function DeleteAccountClient({ graceDays }: DeleteAccountClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<"password" | null>(null);
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
    setFieldError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await requestAccountDeletion(formData);

        if (result.success) {
          applyRetryAt(null);
          setSuccess(true);
          const destination = result.redirectUrl ?? "/login?deleted=scheduled";
          router.push(destination);
          router.refresh();
        } else {
          const retryAt = result.retryAt ?? null;
          setError(result.error);
          setFieldError(result.field === "password" ? "password" : null);
          applyRetryAt(retryAt, retryAt ? () => setError(null) : undefined);
        }
      } catch {
        applyRetryAt(null);
        setError(GENERIC_ACTION_ERROR);
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-danger">Delete Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This permanently deletes your account after a {graceDays}-day recovery window.
          </p>
        </div>

        <div className="state-error mb-6">
          <p className="font-medium">This action is irreversible after the grace period.</p>
          <p className="mt-1 text-xs">
            You will be signed out immediately. All account data will be removed once deletion is
            finalized.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium">
              Current Password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending || success}
              className={`form-field form-field-md ${fieldError === "password" ? "border-danger" : ""}`}
              placeholder="********"
              aria-describedby={fieldError === "password" ? "delete-password-error" : undefined}
            />
          </div>

          <div>
            <label htmlFor="confirmation" className="mb-1.5 block text-sm font-medium">
              Type DELETE to confirm
            </label>
            <input
              id="confirmation"
              name="confirmation"
              type="text"
              required
              disabled={isPending || success}
              className="form-field form-field-md"
              placeholder="DELETE"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="state-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || success || isRateLimited}
            className="btn-danger btn-md w-full"
          >
            {isPending ? "Deleting account..." : "Delete account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/app/settings" className="btn-link text-sm">
            ← Back to settings
          </Link>
        </p>
      </div>
    </main>
  );
}
