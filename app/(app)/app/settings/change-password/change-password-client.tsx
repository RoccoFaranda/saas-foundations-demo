"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { changePassword } from "@/src/lib/auth/actions";
import { GENERIC_ACTION_ERROR } from "@/src/lib/ui/messages";

export default function ChangePasswordClient() {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldError, setFieldError] = useState<"email" | "password" | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await changePassword(formData);

        if (result.success) {
          setSuccess(true);
          setRefreshError(null);
          try {
            await update({ refresh: true });
          } catch {
            setRefreshError("Please sign in again to continue.");
          }
          setTimeout(() => {
            router.push("/app/settings");
            router.refresh();
          }, 1500);
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
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your current and new password</p>
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
              className={`form-field form-field-md ${fieldError === "password" ? "border-danger" : ""}`}
              placeholder="********"
              aria-describedby={fieldError === "password" ? "password-error" : undefined}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium">
              New Password
            </label>
            <input
              id="newPassword"
              name="newPassword"
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
              Password changed successfully! Redirecting...
            </div>
          )}
          {refreshError && (
            <div className="state-info" role="status">
              {refreshError}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || success}
            className="btn-primary btn-md w-full"
          >
            {isPending ? "Changing password..." : success ? "Password changed!" : "Change Password"}
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
