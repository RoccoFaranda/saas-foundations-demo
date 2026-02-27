import type { Metadata } from "next";
import Link from "next/link";
import { requireVerifiedUser, signOutUser } from "@/src/lib/auth";
import { AppThemeToggle } from "@/src/components/app-theme-toggle";
import { CookiePreferencesTrigger } from "@/src/components/consent/cookie-preferences-trigger";
import { ChevronDownMark } from "@/src/components/icons/chevron-down-mark";
import { CookieMark } from "@/src/components/icons/cookie-mark";
import { MenuMark } from "@/src/components/icons/menu-mark";
import { HeaderContactLink, HeaderGitHubLink } from "@/src/components/header/global-utility-links";
import {
  HeaderMenu,
  HeaderMenuDivider,
  HeaderMenuSection,
} from "@/src/components/header/header-menu";
import { ThemeAccountSync } from "@/src/components/theme-account-sync";
import { PageContainer } from "@/src/components/layout/page-container";
import { NO_INDEX_ROBOTS } from "@/src/lib/seo/metadata";

export const metadata: Metadata = {
  robots: NO_INDEX_ROBOTS,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireVerifiedUser();

  return (
    <div className="flex min-h-screen flex-col [--site-header-h:3.5rem]">
      <ThemeAccountSync />
      {/* Authenticated app header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/92 backdrop-blur">
        <PageContainer className="flex h-(--site-header-h) items-center justify-between gap-3">
          <Link href="/" className="font-semibold focus-ring">
            SaaS Foundations
          </Link>

          <nav className="hidden items-center gap-4 text-sm lg:flex">
            <Link href="/app/dashboard" className="link-subtle focus-ring">
              Dashboard
            </Link>
            <Link href="/" className="link-subtle focus-ring">
              Website
            </Link>
            <HeaderContactLink />
            <HeaderGitHubLink />
            <AppThemeToggle testId="app-theme-toggle-desktop" />
            <CookiePreferencesTrigger
              className="btn-secondary btn-sm w-8 cursor-pointer p-0"
              ariaLabel="Cookie Preferences"
              title="Cookie Preferences"
            >
              <CookieMark className="h-4 w-4" />
            </CookiePreferencesTrigger>

            <HeaderMenu
              label={
                <span className="inline-flex max-w-40 items-center gap-1.5">
                  <span className="min-w-0 truncate" title={user.email}>
                    {user.email}
                  </span>
                  <ChevronDownMark className="motion-transform h-3.5 w-3.5 shrink-0 text-muted-foreground group-open:rotate-180" />
                </span>
              }
              panelClassName="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-lg border border-border bg-surface-elevated p-3 shadow-lg"
            >
              <div>
                <p className="truncate text-xs text-muted-foreground" title={user.email}>
                  {user.email}
                </p>
                <HeaderMenuSection className="mt-2">
                  <Link href="/app/settings" className="btn-outline btn-sm w-full justify-start">
                    Account settings
                  </Link>
                </HeaderMenuSection>
                <form action={signOutUser} className="mt-2">
                  <button
                    type="submit"
                    className="btn-outline btn-sm w-full justify-start border-danger-border/70 text-danger hover:border-danger-border hover:bg-danger-soft/70 hover:text-danger"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </HeaderMenu>
          </nav>

          <div className="flex items-center lg:hidden">
            <span
              className="mr-2 max-w-32 truncate text-xs text-muted-foreground"
              title={user.email}
            >
              {user.email}
            </span>
            <HeaderMenu
              label={
                <>
                  <MenuMark className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </>
              }
              summaryClassName="btn-secondary btn-sm inline-flex w-8 items-center justify-center p-0 list-none [&::-webkit-details-marker]:hidden"
            >
              <div>
                <p className="truncate text-xs text-muted-foreground" title={user.email}>
                  {user.email}
                </p>

                <HeaderMenuSection className="mt-2">
                  <Link href="/app/dashboard" className="btn-primary btn-sm w-full justify-start">
                    Dashboard
                  </Link>
                  <Link href="/" className="btn-outline btn-sm w-full justify-start">
                    Website
                  </Link>
                  <Link href="/app/settings" className="btn-outline btn-sm w-full justify-start">
                    Settings
                  </Link>
                </HeaderMenuSection>

                <HeaderMenuDivider />

                <HeaderMenuSection>
                  <HeaderContactLink variant="menu" />
                  <HeaderGitHubLink variant="menu" />
                </HeaderMenuSection>

                <HeaderMenuDivider />

                <div className="flex items-center gap-2">
                  <AppThemeToggle testId="app-theme-toggle-menu" />
                  <CookiePreferencesTrigger
                    className="btn-secondary btn-sm w-8 cursor-pointer p-0"
                    ariaLabel="Cookie Preferences"
                    title="Cookie Preferences"
                  >
                    <CookieMark className="h-4 w-4" />
                  </CookiePreferencesTrigger>
                </div>

                <form action={signOutUser} className="mt-2">
                  <button
                    type="submit"
                    className="btn-outline btn-sm w-full justify-start border-danger-border/70 text-danger hover:border-danger-border hover:bg-danger-soft/70 hover:text-danger"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </HeaderMenu>
          </div>
        </PageContainer>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
