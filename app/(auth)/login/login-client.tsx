"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/src/lib/auth/actions";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

type LoginClientProps = {
  callbackUrl: string;
  resetSuccess?: boolean;
};

export default function LoginClient({ callbackUrl, resetSuccess }: LoginClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<"email" | "password" | null>(null);
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
        const result = await login(formData);

        if (result.success) {
          applyRetryAt(null);
          const destination = result.redirectUrl ?? "/app/dashboard";
          router.push(destination);
          router.refresh();
        } else {
          const retryAt = result.retryAt ?? null;
          setError(result.error);
          setFieldError(result.field ?? null);
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
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-foreground/60">Sign in to your account</p>
        </div>

        {resetSuccess && (
          <div
            className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
            role="status"
          >
            Your password has been reset. Please sign in again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
              disabled={isPending}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldError === "email" ? "border-red-500" : "border-foreground/20"
              }`}
              placeholder="you@example.com"
              aria-describedby={fieldError === "email" ? "email-error" : undefined}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldError === "password" ? "border-red-500" : "border-foreground/20"
              }`}
              placeholder="••••••••"
              aria-describedby={fieldError === "password" ? "password-error" : undefined}
            />
          </div>

          {error && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || isRateLimited}
            className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link
            href="/forgot-password"
            className="text-foreground/60 hover:text-foreground hover:underline"
          >
            Forgot your password?
          </Link>
        </p>

        <p className="mt-6 text-center text-sm text-foreground/60">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
