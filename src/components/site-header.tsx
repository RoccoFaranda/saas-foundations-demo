import Link from "next/link";
import { GitHubMark } from "./icons/github-mark";
import { ThemeToggle } from "./theme-toggle";
import { PageContainer } from "./layout/page-container";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/92 backdrop-blur">
      <PageContainer className="flex h-[var(--site-header-h)] items-center justify-between">
        <Link href="/" className="font-semibold focus-ring">
          SaaS Foundations
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="link-subtle focus-ring">
            Home
          </Link>
          <Link href="/demo" className="link-subtle focus-ring">
            Demo
          </Link>
          <Link href="/login" className="link-subtle focus-ring">
            App
          </Link>
          <a
            href="https://github.com/RoccoFaranda/saas-foundations-demo"
            target="_blank"
            rel="noreferrer noopener"
            className="link-subtle focus-ring inline-flex items-center gap-1"
          >
            <GitHubMark className="h-3.5 w-3.5" />
            GitHub
          </a>
          <ThemeToggle />
        </nav>
      </PageContainer>
    </header>
  );
}
