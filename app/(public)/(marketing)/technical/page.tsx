import Link from "next/link";
import { GitHubMark } from "@/src/components/icons/github-mark";
import { PageContainer } from "@/src/components/layout/page-container";
import { GITHUB_REPO_URL } from "@/src/content/profile/public-metadata";

export default function TechnicalPage() {
  return (
    <div className="py-16 sm:py-20">
      <PageContainer
        size="narrow"
        className="rounded-2xl border border-border bg-surface p-8 sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Coming Next
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Technical</h1>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-outline btn-sm inline-flex items-center gap-1"
          >
            <GitHubMark className="h-3.5 w-3.5" />
            View Repository
          </a>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          This page will document what is real, what is simulated, and how auth, security controls,
          and testing are implemented in the demo.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary btn-md">
            Back to Landing
          </Link>
          <Link href="/demo" className="btn-secondary btn-md">
            Open Demo App
          </Link>
        </div>
      </PageContainer>
    </div>
  );
}
