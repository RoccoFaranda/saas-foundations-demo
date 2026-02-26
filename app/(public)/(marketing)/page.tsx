import Link from "next/link";
import { GitHubMark } from "@/src/components/icons/github-mark";
import { HeroProofStrip } from "@/src/components/marketing/hero-proof-strip";
import { StickyDashboardStory } from "@/src/components/marketing/sticky-dashboard-story";
import { PageContainer } from "@/src/components/layout/page-container";
import { GITHUB_REPO_URL } from "@/src/content/profile/public-metadata";

type ProofPillar = {
  key: string;
  chipLabel: string;
  title: string;
  description: string;
};

type HeroCheckpoint = {
  label: string;
  detail: string;
};

type HeroRoute = {
  href: string;
  route: string;
  label: string;
};

type ReviewPath = {
  id: string;
  label: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  repoHref?: string;
};

const proofPillars: ProofPillar[] = [
  {
    key: "guest-reset",
    chipLabel: "Guest Mode (Reset on Refresh)",
    title: "Demo-Safe Guest Experience",
    description:
      "A realistic dashboard opens instantly. Interactions feel real, but guest changes are local-only and reset on refresh.",
  },
  {
    key: "auth-lifecycle",
    chipLabel: "Real Auth Lifecycle",
    title: "Secure Account Flows",
    description:
      "Signup, email verification, login gating, password reset, and email/password change flows are implemented as real product behavior.",
  },
  {
    key: "dashboard-patterns",
    chipLabel: "Dashboard UX Patterns",
    title: "Product Dashboard Patterns",
    description:
      "KPI cards, filtering, search, sort, pagination, and row actions are built as production-style SaaS UI patterns.",
  },
  {
    key: "theme-accessibility",
    chipLabel: "Theme & Accessibility",
    title: "Theme + UX Polish",
    description:
      "Light/dark/system theme support with consistent component behavior and motion/accessibility-conscious interactions.",
  },
  {
    key: "security-controls",
    chipLabel: "Security Controls",
    title: "Abuse Prevention + Validation",
    description:
      "Input validation, rate limiting strategy, and bot-protection-first posture designed for a public-facing demo.",
  },
  {
    key: "quality-docs",
    chipLabel: "Tested + Documented",
    title: "Quality Gates + Architecture",
    description:
      "Type-safe architecture with unit/E2E coverage and documentation so technical reviewers can audit implementation quality quickly.",
  },
];

const heroCheckpoints: HeroCheckpoint[] = [
  {
    label: "Guest path works instantly",
    detail: "/demo opens with seeded data and no signup friction.",
  },
  {
    label: "Auth lifecycle is real",
    detail: "Verification, reset, and account security flows run end to end.",
  },
  {
    label: "Technical quality is inspectable",
    detail:
      "Architecture notes, validation strategy, and test coverage are documented and runnable.",
  },
];

const heroRoutes: HeroRoute[] = [
  {
    href: "/demo",
    route: "/demo",
    label: "Live product walkthrough",
  },
  {
    href: "/signup",
    route: "/signup",
    label: "Auth flow entry point",
  },
  {
    href: "/technical",
    route: "/technical",
    label: "Implementation scope",
  },
];

const reviewPaths: ReviewPath[] = [
  {
    id: "product",
    label: "Path 1",
    title: "Product-First Review",
    description:
      "Walk through dashboard UX first, then move into signup and account security flows.",
    primaryLabel: "Open Live Demo",
    primaryHref: "/demo",
    secondaryLabel: "Try Signup Flow",
    secondaryHref: "/signup",
  },
  {
    id: "technical",
    label: "Path 2",
    title: "Technical-First Review",
    description: "Trace implemented scope, simulated boundaries, and structural decisions.",
    primaryLabel: "View Technical Scope",
    primaryHref: "/technical",
    repoHref: GITHUB_REPO_URL,
  },
];

export default function MarketingHomePage() {
  return (
    <div className="overflow-x-clip">
      <section className="relative overflow-hidden border-b border-border pb-18 pt-18 sm:pb-22 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-surface" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(110% 78% at 50% 0%, color-mix(in srgb, var(--info) 20%, transparent) 0%, color-mix(in srgb, var(--primary) 14%, transparent) 30%, transparent 72%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in srgb, var(--border-strong) 32%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border-strong) 22%, transparent) 1px, transparent 1px)",
              backgroundSize: "46px 46px",
            }}
          />
          <div
            className="absolute left-1/2 top-0 h-56 w-2xl -translate-x-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--info) 16%, transparent) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-32"
            style={{
              backgroundImage: "linear-gradient(to bottom, transparent 0%, var(--surface) 100%)",
            }}
          />
        </div>

        <PageContainer className="relative grid gap-10 lg:grid-cols-[minmax(0,1.16fr)_minmax(0,0.84fr)] lg:items-end">
          <div className="text-center lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              SaaS Foundations Demo
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl lg:mx-0 lg:max-w-3xl">
              A production-style SaaS demo, end to end.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0 lg:max-w-2xl">
              Explore a realistic project-management app instantly as a guest, or sign up to test
              real auth and account flows.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link href="/demo" className="btn-primary btn-md">
                Explore Demo
              </Link>
              <Link href="/technical" className="btn-secondary btn-md">
                View Technical Scope
              </Link>
              <Link href="/contact" className="btn-outline btn-md">
                Contact
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground lg:justify-start lg:text-sm">
              <p>No signup required for demo access.</p>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="focus-ring inline-flex items-center gap-1 text-link transition-colors hover:underline"
              >
                <GitHubMark className="h-3.5 w-3.5" />
                Source code on GitHub
              </a>
            </div>

            <HeroProofStrip pillars={proofPillars} sectionId="features" />
          </div>

          <aside className="surface-card-elevated relative overflow-hidden p-6 sm:p-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-18"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, color-mix(in srgb, var(--info-soft) 58%, transparent), transparent)",
              }}
            />
            <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Evaluation Brief
            </p>
            <h2 className="relative mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Core capabilities at a glance
            </h2>

            <ul className="relative mt-5 space-y-3.5">
              {heroCheckpoints.map((checkpoint) => (
                <li key={checkpoint.label} className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/75"
                    style={{
                      boxShadow: "0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent)",
                    }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{checkpoint.label}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {checkpoint.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="relative mt-6 grid gap-2 border-t border-border pt-4 sm:grid-cols-3">
              {heroRoutes.map((entry) => (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="focus-ring rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-border-strong hover:bg-surface-elevated"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {entry.route}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{entry.label}</p>
                </Link>
              ))}
            </div>
          </aside>
        </PageContainer>
      </section>

      <StickyDashboardStory />

      <section
        id="features"
        className="scroll-mt-[calc(var(--site-header-h)+1rem)] border-y border-border py-16 sm:py-20"
      >
        <PageContainer>
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Core Implementation Areas
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Production habits, not just visual polish
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Each pillar maps to concrete behavior in the live app and in corresponding technical
              documentation.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proofPillars.map((pillar) => (
              <article
                key={pillar.key}
                id={`proof-${pillar.key}`}
                data-testid={`proof-card-${pillar.key}`}
                className="proof-card scroll-mt-[calc(var(--site-header-h)+1rem)] rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <h3 className="text-base font-semibold">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <Link
                    href="/demo"
                    className="focus-ring inline-flex rounded-full border border-border bg-muted/50 px-2 py-1 font-medium transition-colors hover:border-border-strong hover:bg-muted"
                  >
                    Live in demo
                  </Link>
                  <Link href="/technical" className="link-subtle focus-ring text-xs">
                    Technical notes
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-16 sm:py-20">
        <PageContainer>
          <div className="rounded-2xl border border-border bg-muted/35 p-6 sm:p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Review Paths
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Two paths through the demo
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              One path prioritizes product interaction. The other prioritizes implementation depth
              and architecture context.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {reviewPaths.map((path) => (
                <article
                  key={path.id}
                  className="flex h-full flex-col rounded-xl border border-border bg-surface p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {path.label}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight">{path.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{path.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2 pt-3 lg:mt-auto">
                    <Link href={path.primaryHref} className="btn-primary btn-sm">
                      {path.primaryLabel}
                    </Link>
                    {path.secondaryLabel && path.secondaryHref ? (
                      <Link href={path.secondaryHref} className="btn-secondary btn-sm">
                        {path.secondaryLabel}
                      </Link>
                    ) : null}
                    {path.repoHref ? (
                      <a
                        href={path.repoHref}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="btn-secondary btn-sm inline-flex items-center gap-1"
                      >
                        <GitHubMark className="h-3.5 w-3.5" />
                        View Repo
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-7 border-t border-border pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Project inquiries, implementation details, and build planning.
              </p>
              <div className="mt-3">
                <Link href="/contact" className="btn-outline btn-sm">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
