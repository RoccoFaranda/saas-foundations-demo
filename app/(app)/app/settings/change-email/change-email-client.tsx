"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestEmailChange } from "@/src/lib/auth/actions";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

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
      try {
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
      } catch {
        setError(GENERIC_ACTION_ERROR);
      }
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Change Email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your current password and new email address
          </p>
        </div>

        <div className="state-info mb-4">
          <p className="text-muted-foreground">
            <span className="font-medium">Current email:</span> {currentEmail}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium">
              Password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
              className={`form-field form-field-md ${fieldError === "password" ? "border-danger" : ""}`}
              placeholder="********"
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
              maxLength={255}
              disabled={isPending}
              className={`form-field form-field-md ${fieldError === "email" ? "border-danger" : ""}`}
              placeholder="new@example.com"
              aria-describedby={fieldError === "email" ? "email-error" : undefined}
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
              Verification email sent! Please check your new email address to complete the change.
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || success}
            className="btn-primary btn-md w-full"
          >
            {isPending
              ? "Sending verification email..."
              : success
                ? "Email sent!"
                : "Request Email Change"}
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
