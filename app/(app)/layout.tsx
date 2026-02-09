import Link from "next/link";
import { requireVerifiedUser, signOutUser } from "@/src/lib/auth";
import { AppThemeToggle } from "@/src/components/app-theme-toggle";
import { ThemeAccountSync } from "@/src/components/theme-account-sync";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVerifiedUser();

  return (
    <div className="flex min-h-screen flex-col">
      <ThemeAccountSync />
      {/* Authenticated app header */}
      <header className="border-b border-foreground/10 bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="font-semibold">
            SaaS Foundations
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/app/dashboard"
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/app/settings"
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              Settings
            </Link>
            <span className="max-w-36 truncate text-foreground/60 sm:max-w-52" title={user.email}>
              {user.email}
            </span>
            <form action={signOutUser}>
              <button
                type="submit"
                className="cursor-pointer text-foreground/70 transition-colors hover:text-foreground"
              >
                Sign out
              </button>
            </form>
            <AppThemeToggle />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
