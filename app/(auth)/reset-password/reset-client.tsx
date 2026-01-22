"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/src/lib/auth/actions";

type ResetClientProps = {
  token: string | null;
  tokenValid: boolean | null;
};

export default function ResetClient({ token, tokenValid }: ResetClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (token) {
      formData.set("token", token);
    }

    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result.success) {
        setSuccess(true);
        const redirectUrl = result.redirectUrl ?? "/login";
        // Redirect to login after short delay
        setTimeout(() => router.push(redirectUrl), 800);
      } else {
        setError(result.error);
      }
    });
  }

  // No token provided - show instructions
  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="mt-2 text-sm text-foreground/60">
              Please check your email for a password reset link.
            </p>
          </div>

          <div className="mb-4">
            <Link
              href="/forgot-password"
              className="inline-block rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2"
            >
              Send reset email
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Token present but invalid
  if (tokenValid === false) {
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
            <h1 className="text-2xl font-bold">Reset link invalid</h1>
            <p className="mt-2 text-sm text-foreground/60">
              This reset link is invalid, expired, or already used.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/forgot-password"
              className="block rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2"
            >
              Request a new reset email
            </Link>
            <Link
              href="/login"
              className="block text-sm text-foreground/60 hover:text-foreground hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Token present and valid -> show form
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="mt-2 text-sm text-foreground/60">Enter a new password for your account.</p>
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
              disabled={isPending || success}
              className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
              role="status"
            >
              Password reset! Redirecting to login...
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || success}
            className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Resetting..." : "Reset password"}
          </button>
        </form>
      </div>
    </main>
  );
}
