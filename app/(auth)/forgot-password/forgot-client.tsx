"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { forgotPassword } from "@/src/lib/auth/actions";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

export default function ForgotClient() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
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
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await forgotPassword(formData);
        if (result.success) {
          setMessage("If an account with that email exists, a reset email has been sent.");
          applyRetryAt(null);
        } else {
          const retryAt = result.retryAt ?? null;
          setMessage(result.error);
          applyRetryAt(retryAt, retryAt ? () => setMessage(null) : undefined);
        }
      } catch {
        applyRetryAt(null);
        setMessage(GENERIC_ACTION_ERROR);
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Forgot password</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Enter your email and we&apos;ll send reset instructions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={isPending}
              className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          {message && (
            <div
              className="rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground/80"
              role="status"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isRateLimited}
            className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Sending..." : "Send reset email"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          Remembered?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
