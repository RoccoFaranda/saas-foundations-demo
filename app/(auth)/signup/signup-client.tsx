"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Turnstile from "react-turnstile";
import { signup } from "@/src/lib/auth/actions";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

type SignupClientProps = {
  turnstileSiteKey: string | null;
  turnstileMisconfiguredMessage?: string | null;
};

export default function SignupClient({
  turnstileSiteKey,
  turnstileMisconfiguredMessage,
}: SignupClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<"email" | "password" | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const siteKey = turnstileSiteKey;
  const turnstileMessage = turnstileMisconfiguredMessage ?? turnstileError;
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
    if (turnstileMessage || turnstileMisconfiguredMessage) {
      return;
    }
    setError(null);
    setFieldError(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await signup(formData);

        if (result.success) {
          applyRetryAt(null);
          router.push("/verify-email");
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
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started with SaaS Foundations Demo
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
              maxLength={255}
              disabled={isPending}
              className={`form-field form-field-md ${fieldError === "email" ? "border-danger" : ""}`}
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
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={isPending}
              className={`form-field form-field-md ${fieldError === "password" ? "border-danger" : ""}`}
              placeholder="********"
              aria-describedby={fieldError === "password" ? "password-error" : undefined}
            />
            <p className="mt-1 text-xs text-muted-foreground">At least 8 characters</p>
          </div>

          {siteKey && (
            <div>
              <Turnstile
                sitekey={siteKey}
                theme="auto"
                refreshExpired="auto"
                onError={() =>
                  setTurnstileError("Sign up is temporarily unavailable. Please contact support.")
                }
              />
            </div>
          )}

          {turnstileMessage && (
            <div className="state-error" role="alert">
              {turnstileMessage}
            </div>
          )}

          {error && (
            <div className="state-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isPending ||
              isRateLimited ||
              Boolean(turnstileMisconfiguredMessage) ||
              Boolean(turnstileError)
            }
            className="btn-primary btn-md w-full"
          >
            {isPending ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
