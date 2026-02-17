import Link from "next/link";
import { HeroProofStrip } from "@/src/components/marketing/hero-proof-strip";
import { StickyDashboardStory } from "@/src/components/marketing/sticky-dashboard-story";
import { PageContainer } from "@/src/components/layout/page-container";

type ProofPillar = {
  key: string;
  chipLabel: string;
  title: string;
  description: string;
};

const proofPillars: ProofPillar[] = [
  {
    key: "guest-reset",
    chipLabel: "Guest Mode (Reset on Refresh)",
    title: "Demo-Safe Guest Experience",
    description:
      "Explore a realistic dashboard instantly. Interactions feel real, but guest changes are local-only and reset on refresh.",
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

export default function MarketingHomePage() {
  return (
    <div className="overflow-x-clip">
      <section className="relative border-b border-border pb-16 pt-18 sm:pb-20 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-surface" />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(120% 85% at 50% 0%, color-mix(in srgb, var(--info) 22%, transparent) 0%, color-mix(in srgb, var(--primary) 15%, transparent) 35%, transparent 72%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(to right, color-mix(in srgb, var(--border-strong) 36%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border-strong) 26%, transparent) 1px, transparent 1px)",
              backgroundSize: "46px 46px",
            }}
          />
          <div
            className="absolute left-1/2 top-0 h-64 w-2xl -translate-x-1/2 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--info) 20%, transparent) 0%, transparent 68%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-28"
            style={{
              backgroundImage: "linear-gradient(to bottom, transparent 0%, var(--surface) 100%)",
            }}
          />
        </div>

        <PageContainer className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Public SaaS Foundations Demo
          </p>
          <h1 className="mx-auto mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            An SaaS demo you can click through and audit.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
            Explore a realistic project-management app instantly as a guest, or sign up to test real
            auth and account flows.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

          <HeroProofStrip pillars={proofPillars} sectionId="features" />
        </PageContainer>
      </section>

      <StickyDashboardStory />

      <section
        id="features"
        className="scroll-mt-[calc(var(--site-header-h)+1rem)] border-y border-border py-16 sm:py-20"
      >
        <PageContainer>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              What This Demo Proves
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Product design and implementation quality
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Each proof point maps to a real capability you can evaluate directly in the demo app
              and technical documentation.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proofPillars.map((pillar) => (
              <article
                key={pillar.key}
                id={`proof-${pillar.key}`}
                data-testid={`proof-card-${pillar.key}`}
                className="proof-card scroll-mt-[calc(var(--site-header-h)+1rem)] rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <h3 className="text-base font-semibold">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-16 sm:py-20">
        <PageContainer className="rounded-2xl border border-border bg-muted/45 p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Next In This Build
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Dedicated marketing pages are next
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            This first draft focuses on getting the landing page right. Features, pricing,
            technical, process, and contact pages are scaffolded now and will be expanded in the
            next iteration.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {["/features", "/pricing", "/technical", "/about", "/process", "/contact"].map(
              (path) => (
                <Link
                  key={path}
                  href={path}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-border-strong"
                >
                  {path}
                </Link>
              )
            )}
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
