import Link from "next/link";
import { StickyDashboardStory } from "@/src/components/marketing/sticky-dashboard-story";
import { PageContainer } from "@/src/components/layout/page-container";

const featureCards = [
  {
    title: "Projects Dashboard",
    description: "KPI cards, filters, search, sort, pagination, and actionable tables.",
  },
  {
    title: "Secure Account Flows",
    description: "Signup, verify email, reset password, and change email/password flows.",
  },
  {
    title: "Theme & UX Polish",
    description: "Light, dark, and system themes with consistent component behavior.",
  },
  {
    title: "Demo-Safe Behavior",
    description: "Guest interactions feel real while changes reset on refresh.",
  },
  {
    title: "Analytics Views",
    description: "Status distribution and completion trend visualizations for quick decisions.",
  },
  {
    title: "Production Foundations",
    description: "Validation, rate limiting, tests, and architecture docs.",
  },
];

export default function MarketingHomePage() {
  return (
    <div className="overflow-x-clip">
      <section className="relative border-b border-border pb-16 pt-18 sm:pb-20 sm:pt-24">
        {/* theme-exception reason:"Decorative hero gradient for marketing depth" ticket:"THEME-001" expires:"2026-12-31" */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_65%)]"
        />

        <PageContainer className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Project Management SaaS Demo
          </p>
          <h1 className="mx-auto mt-3 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
            Landing experience + real product interactions in one demo app
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
            This is not a static mockup. You can explore a live dashboard with project statuses,
            filters, analytics, and account flows designed to mirror real SaaS behavior.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/demo" className="btn-primary btn-md">
              Explore Live Demo
            </Link>
            <Link href="/signup" className="btn-secondary btn-md">
              Create Account
            </Link>
            <Link href="/technical" className="btn-outline btn-md">
              View Technical Scope
            </Link>
          </div>
        </PageContainer>
      </section>

      <StickyDashboardStory />

      <section id="features" className="border-y border-border py-16 sm:py-20">
        <PageContainer>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              What This Demo Proves
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Product design and implementation quality
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              The marketing layer and the app layer are designed together. Visitors can evaluate
              both the visual polish and the practical depth of the implementation.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((card) => (
              <article
                key={card.title}
                className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <h3 className="text-base font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.description}</p>
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
