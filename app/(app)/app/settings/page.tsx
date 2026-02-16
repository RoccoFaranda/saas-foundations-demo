import Link from "next/link";
import { requireVerifiedUser } from "@/src/lib/auth/session";

export default async function SettingsPage() {
  await requireVerifiedUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage your account preferences</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/app/settings/change-password"
            className="surface-card motion-colors block px-6 py-4 hover:bg-muted focus-ring"
          >
            <h2 className="text-lg font-semibold">Change Password</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update your account password</p>
          </Link>

          <Link
            href="/app/settings/change-email"
            className="surface-card motion-colors block px-6 py-4 hover:bg-muted focus-ring"
          >
            <h2 className="text-lg font-semibold">Change Email</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update your email address</p>
          </Link>

          <Link href="/app/dashboard" className="btn-link text-sm">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
