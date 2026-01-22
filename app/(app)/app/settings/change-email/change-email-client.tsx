"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestEmailChange } from "@/src/lib/auth/actions";

type ChangeEmailClientProps = {
  currentEmail: string;
};

export default function ChangeEmailClient({ currentEmail }: ChangeEmailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<"email" | "password" | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await requestEmailChange(formData);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/app/settings");
          router.refresh();
        }, 2000);
      } else {
        setError(result.error);
        setFieldError(result.field ?? null);
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Change Email</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Enter your current password and new email address
          </p>
        </div>

        <div className="mb-4 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm">
          <p className="text-foreground/80">
            <span className="font-medium">Current email:</span> {currentEmail}
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
              disabled={isPending}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldError === "password" ? "border-red-500" : "border-foreground/20"
              }`}
              placeholder="••••••••"
              aria-describedby={fieldError === "password" ? "password-error" : undefined}
            />
          </div>

          <div>
            <label htmlFor="newEmail" className="mb-1.5 block text-sm font-medium">
              New Email
            </label>
            <input
              id="newEmail"
              name="newEmail"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldError === "email" ? "border-red-500" : "border-foreground/20"
              }`}
              placeholder="new@example.com"
              aria-describedby={fieldError === "email" ? "email-error" : undefined}
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

          {success && (
            <div
              className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400"
              role="status"
            >
              Verification email sent! Please check your new email address to complete the change.
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || success}
            className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? "Sending verification email..."
              : success
                ? "Email sent!"
                : "Request Email Change"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/60">
          <Link href="/app/settings" className="font-medium text-foreground hover:underline">
            ← Back to settings
          </Link>
        </p>
      </div>
    </main>
  );
}
