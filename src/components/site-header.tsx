import Link from "next/link";
import { CookieMark } from "./icons/cookie-mark";
import { MenuMark } from "./icons/menu-mark";
import { ThemeToggle } from "./theme-toggle";
import { CookiePreferencesTrigger } from "./consent/cookie-preferences-trigger";
import { PageContainer } from "./layout/page-container";
import { HeaderContactLink, HeaderGitHubLink } from "./header/global-utility-links";
import { HeaderMenu, HeaderMenuDivider, HeaderMenuSection } from "./header/header-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/92 backdrop-blur">
      <PageContainer className="flex h-[var(--site-header-h)] items-center justify-between gap-3">
        <Link href="/" className="font-semibold focus-ring">
          SaaS Foundations
        </Link>

        <nav className="hidden items-center gap-4 text-sm lg:flex">
          <Link href="/" className="link-subtle focus-ring">
            Home
          </Link>
          <Link href="/demo" className="link-subtle focus-ring">
            Demo
          </Link>
          <Link href="/technical" className="link-subtle focus-ring">
            Technical
          </Link>
          <HeaderContactLink />
          <HeaderGitHubLink />
          <ThemeToggle testId="theme-toggle-desktop" />
          <CookiePreferencesTrigger
            className="btn-secondary btn-sm w-8 cursor-pointer p-0"
            ariaLabel="Cookie Preferences"
            title="Cookie Preferences"
          >
            <CookieMark className="h-4 w-4" />
          </CookiePreferencesTrigger>
          <Link href="/login" className="btn-secondary btn-sm">
            Open App
          </Link>
        </nav>

        <div className="flex items-center lg:hidden">
          <HeaderMenu
            label={
              <>
                <MenuMark className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </>
            }
            summaryClassName="btn-secondary btn-sm inline-flex w-8 items-center justify-center p-0 list-none [&::-webkit-details-marker]:hidden"
          >
            <HeaderMenuSection>
              <Link href="/login" className="btn-panel">
                Open App
              </Link>
            </HeaderMenuSection>

            <HeaderMenuDivider />

            <HeaderMenuSection>
              <Link href="/" className="btn-panel">
                Home
              </Link>
              <Link href="/demo" className="btn-panel">
                Demo
              </Link>
              <Link href="/technical" className="btn-panel">
                Technical
              </Link>
            </HeaderMenuSection>

            <HeaderMenuDivider />

            <HeaderMenuSection>
              <HeaderContactLink variant="panel" />
              <HeaderGitHubLink variant="panel" />
            </HeaderMenuSection>

            <HeaderMenuDivider />

            <div className="flex items-center gap-2">
              <ThemeToggle testId="theme-toggle-menu" />
              <CookiePreferencesTrigger
                className="btn-secondary btn-sm w-8 cursor-pointer p-0"
                ariaLabel="Cookie Preferences"
                title="Cookie Preferences"
              >
                <CookieMark className="h-4 w-4" />
              </CookiePreferencesTrigger>
            </div>
          </HeaderMenu>
        </div>
      </PageContainer>
    </header>
  );
}
