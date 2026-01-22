"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { forgotPassword } from "@/src/lib/auth/actions";

export default function ForgotClient() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await forgotPassword(formData);
      if (result.success) {
        setMessage("If an account with that email exists, a reset email has been sent.");
      } else {
        setMessage(result.error);
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
            disabled={isPending}
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
