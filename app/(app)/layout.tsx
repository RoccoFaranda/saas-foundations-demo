import Link from "next/link";
import { requireVerifiedUser, signOutUser } from "@/src/lib/auth";
import { AppThemeToggle } from "@/src/components/app-theme-toggle";
import { ThemeAccountSync } from "@/src/components/theme-account-sync";
import { PageContainer } from "@/src/components/layout/page-container";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVerifiedUser();

  return (
    <div className="flex min-h-screen flex-col">
      <ThemeAccountSync />
      {/* Authenticated app header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/92 backdrop-blur">
        <PageContainer className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="font-semibold">
            SaaS Foundations
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/app/dashboard" className="link-subtle focus-ring">
              Dashboard
            </Link>
            <Link href="/app/settings" className="link-subtle focus-ring">
              Settings
            </Link>
            <span
              className="max-w-36 truncate text-muted-foreground sm:max-w-52"
              title={user.email}
            >
              {user.email}
            </span>
            <form action={signOutUser}>
              <button type="submit" className="link-subtle cursor-pointer focus-ring">
                Sign out
              </button>
            </form>
            <AppThemeToggle />
          </nav>
        </PageContainer>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
