import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLinkMark } from "@/src/components/icons/external-link-mark";
import { GitHubMark } from "@/src/components/icons/github-mark";
import { PageContainer } from "@/src/components/layout/page-container";
import { JsonLd } from "@/src/components/seo/json-ld";
import { GITHUB_REPO_URL } from "@/src/content/profile/public-metadata";
import { buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";

type AuditLink = {
  label: string;
  href: string;
};

type TechnicalHighlight = {
  eyebrow: string;
  title: string;
  description: string;
};

type TechnicalArea = {
  id: string;
  navLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  links: AuditLink[];
};

const technicalDescription =
  "Technical overview covering auth, security, rate limits, operational safeguards, architecture discipline, and release checks.";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Technical Scope",
  description: technicalDescription,
  path: "/technical",
});

const webPageJsonLd = buildWebPageJsonLd({
  title: "Technical Scope",
  description: technicalDescription,
  path: "/technical",
});

const REPO_BLOB_BASE = `${GITHUB_REPO_URL}/blob/main`;

function repoFile(path: string): string {
  return `${REPO_BLOB_BASE}/${path}`;
}

const coreStack = [
  "Next.js 16, React 19, and TypeScript on Node 24",
  "Tailwind CSS",
  "Prisma with Postgres",
];

const platformServices = [
  "Vercel hosting",
  "Neon Postgres",
  "Upstash Redis",
  "Resend email delivery",
  "Cloudflare Turnstile",
];

const technicalHighlights: TechnicalHighlight[] = [
  {
    eyebrow: "Auth",
    title: "Real auth lifecycle",
    description:
      "Signup, verification, login gating, reset password, change email/password, and scheduled account deletion with restore are implemented as real product flows.",
  },
  {
    eyebrow: "Security",
    title: "Public request hardening",
    description:
      "Zod validation, Cloudflare Turnstile on signup, and shared rate limiting across auth, consent, export, and health routes.",
  },
  {
    eyebrow: "Ops",
    title: "Operational safeguards",
    description:
      "Deployed environment validation blocks missing critical settings, production can fail closed, and readiness is bearer-protected.",
  },
  {
    eyebrow: "Verification",
    title: "Verification and release discipline",
    description:
      "The repo includes architecture docs, ADRs, targeted tests, CI, separate E2E, and visual regression workflows.",
  },
];

const technicalAreas: TechnicalArea[] = [
  {
    id: "auth-session-model",
    navLabel: "Auth",
    eyebrow: "Identity",
    title: "Auth and session model",
    description:
      "Account lifecycle work is treated as core product behavior, not as a single happy-path sign-in form.",
    bullets: [
      "Auth.js credentials auth uses JWT sessions carrying user ID, verification state, and session version.",
      "proxy.ts protects /app/* and redirects both unauthenticated and unverified users before dashboard routes render.",
      "Email verification, password reset, change email, change password, and scheduled delete/restore flows each have dedicated handling.",
      "Passwords use Argon2id; auth tokens are 32-byte random values stored only as HMAC-SHA-256 hashes with single-use expiry semantics.",
    ],
    links: [
      { label: "Auth config", href: repoFile("src/lib/auth/config.ts") },
      { label: "Token handling", href: repoFile("src/lib/auth/tokens.ts") },
      { label: "Route protection", href: repoFile("proxy.ts") },
      { label: "Auth tests", href: repoFile("src/lib/__tests__/auth-session.test.ts") },
    ],
  },
  {
    id: "public-abuse-prevention",
    navLabel: "Security",
    eyebrow: "Traffic Hardening",
    title: "Public abuse prevention",
    description:
      "The public-facing parts of the app are intentionally hardened because this demo is meant to be safe to expose.",
    bullets: [
      "Boundary validation uses Zod for auth forms, dashboard input, and query parameters before writes happen.",
      "Signup integrates Cloudflare Turnstile, with explicit production policy, misconfiguration warnings, and fail-closed verification behavior.",
      "Shared limiter definitions cover auth flows, dashboard writes, exports, consent audit routes, and the public liveness endpoint.",
      "Blocked or unavailable limiter decisions are logged as structured auth events without leaking request secrets.",
    ],
    links: [
      { label: "Auth validation", href: repoFile("src/lib/validation/auth.ts") },
      { label: "Rate limit policy", href: repoFile("src/lib/ratelimit.ts") },
      { label: "Auth rate-limit enforcement", href: repoFile("src/lib/auth/rate-limit.ts") },
      { label: "Turnstile policy", href: repoFile("src/lib/auth/turnstile.ts") },
    ],
  },
  {
    id: "architecture-boundaries",
    navLabel: "Architecture",
    eyebrow: "Structure",
    title: "Architecture and service boundaries",
    description:
      "The codebase is organized so the boring parts stay inspectable instead of being hidden behind page-level glue.",
    bullets: [
      "App Router defaults to server-side rendering and only opts into client components where interactivity is actually required.",
      "API handlers and server actions stay thin: validate, authorize, call service helpers, then return safe results.",
      "Business logic lives under src/lib so auth, consent, dashboard data, and deployment checks are testable outside page components.",
      "The data model is intentionally per-user, which keeps authorization and query scoping explicit instead of faking multi-tenancy.",
    ],
    links: [
      { label: "Architecture overview", href: repoFile("docs/architecture.md") },
      { label: "ADRs", href: repoFile("docs/decisions.md") },
      { label: "Dashboard actions", href: repoFile("app/(app)/app/dashboard/actions.ts") },
      { label: "Item service", href: repoFile("src/lib/items.ts") },
    ],
  },
  {
    id: "data-auditability",
    navLabel: "Audit",
    eyebrow: "Data Discipline",
    title: "Data boundaries and auditability",
    description:
      "Guest mode, authenticated persistence, and consent evidence all follow different rules on purpose and those boundaries are explicit in code.",
    bullets: [
      "Guest mode mutates cloned in-memory data only, so public demo traffic never writes business records and refresh resets state.",
      "Authenticated reads and writes are scoped by userId, with service-layer checks before returning or mutating records.",
      "Consent capture uses signed replay tokens, a browser retry queue, consent-context matching, and idempotent server persistence.",
      "Dashboard mutations pair writes with activity logging and path revalidation so operational behavior is inspectable after changes.",
    ],
    links: [
      { label: "Guest demo route", href: repoFile("app/(public)/(demo)/demo/page.tsx") },
      { label: "Consent replay route", href: repoFile("app/api/consent/audit/route.ts") },
      { label: "Consent retry queue", href: repoFile("src/lib/consent/audit-queue.ts") },
      { label: "Dashboard data queries", href: repoFile("src/lib/dashboard/queries.ts") },
    ],
  },
  {
    id: "operational-safety",
    navLabel: "Ops",
    eyebrow: "Runtime Safety",
    title: "Operational safety",
    description:
      "The deployment story is designed to be explicit about what must be configured, what can fall back, and what should fail hard.",
    bullets: [
      "Deploy-time validation checks critical secrets, email provider rules, Turnstile config, Upstash config, and readiness protection before live environments boot.",
      "Readiness is bearer-token protected and reports degraded status if database or app URL checks fail; liveness is uncached and rate-limited.",
      "Preview and production are treated differently on purpose so reviewers can see where fallbacks are allowed and where the app must be strict.",
      "Node and pnpm versions are pinned, and CI runs Prisma generate plus migrations before checks to reduce environment drift.",
    ],
    links: [
      { label: "Deploy env validation", href: repoFile("src/lib/config/deploy-env.ts") },
      { label: "Health report", href: repoFile("src/lib/health.ts") },
      { label: "Readiness route", href: repoFile("app/api/ready/route.ts") },
      { label: "Package/runtime config", href: repoFile("package.json") },
    ],
  },
  {
    id: "test-release-discipline",
    navLabel: "Proof",
    eyebrow: "Verification",
    title: "Test and release discipline",
    description:
      "Testing, CI, and release checks are treated as part of the implementation, not as an afterthought.",
    bullets: [
      "Vitest covers auth, consent, rate limiting, deployment config, dashboard queries, and other pure or server-side paths.",
      "Playwright covers auth core flow, demo behavior, theme correctness, legal pages, cookie consent, and marketing routes.",
      "GitHub Actions split fast CI, end-to-end, and visual regression into separate workflows so failures are easier to isolate.",
      "Architecture docs, ADRs, and the reviewer guide live alongside the code so technical decisions stay close to implementation.",
    ],
    links: [
      { label: "Reviewer guide", href: repoFile("docs/REVIEWER_GUIDE.md") },
      { label: "CI workflow", href: repoFile(".github/workflows/ci.yml") },
      { label: "E2E workflow", href: repoFile(".github/workflows/e2e.yml") },
      { label: "Visual workflow", href: repoFile(".github/workflows/visual.yml") },
    ],
  },
];

function ActionLink({ link }: { link: AuditLink }) {
  const isInternal = link.href.startsWith("/");

  if (isInternal) {
    return (
      <Link href={link.href} className="btn-outline btn-sm">
        {link.label}
      </Link>
    );
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer noopener"
      className="btn-outline btn-sm inline-flex items-center gap-1.5"
    >
      <ExternalLinkMark className="h-3.5 w-3.5" />
      {link.label}
    </a>
  );
}

export default function TechnicalPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <div className="overflow-x-clip">
        <section className="relative overflow-hidden border-b border-border py-16 sm:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-0 bg-surface-elevated" />
            <div
              className="absolute inset-0 opacity-55"
              style={{
                backgroundImage:
                  "linear-gradient(to right, color-mix(in srgb, var(--border-strong) 26%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--border-strong) 18%, transparent) 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
            <div
              className="absolute -left-24 top-0 h-64 w-64 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--info) 14%, transparent) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute -right-24 bottom-0 h-72 w-72 rounded-full blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--success) 14%, transparent) 0%, transparent 72%)",
              }}
            />
          </div>

          <PageContainer className="grid gap-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.82fr)] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Technical Overview
              </p>
              <h1 className="mt-4 max-w-4xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Proof for the boring parts that matter.
              </h1>
              <p className="mt-5 max-w-3xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
                This page covers auth, request hardening, operational safeguards, architecture
                discipline, and release confidence rather than feature marketing.
              </p>
              <p className="mt-3 max-w-3xl text-balance text-sm leading-6 text-muted-foreground sm:text-base">
                It focuses on the behind-the-scenes implementation details that matter in
                production: what is protected, how failures are handled, and where the code can be
                inspected.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-primary btn-md inline-flex items-center gap-1.5"
                >
                  <GitHubMark className="h-3.5 w-3.5" />
                  View Repository
                </a>
                <Link href="/signup" className="btn-secondary btn-md">
                  Try Signup Flow
                </Link>
                <Link href="/demo" className="btn-outline btn-md">
                  Open Demo App
                </Link>
              </div>

              <nav
                aria-label="Technical section navigation"
                className="mt-8 flex flex-wrap gap-2 text-sm"
              >
                {technicalAreas.map((area) => (
                  <a
                    key={area.id}
                    href={`#${area.id}`}
                    className="focus-ring rounded-full border border-border bg-surface px-3 py-1.5 text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-elevated hover:text-foreground"
                  >
                    {area.navLabel}
                  </a>
                ))}
              </nav>
            </div>

            <aside className="surface-card-elevated overflow-hidden p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Core stack
              </p>
              <ul className="mt-3 space-y-3">
                {coreStack.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/75"
                      style={{
                        boxShadow: "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)",
                      }}
                    />
                    <span className="text-sm leading-6 text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Production services
                </p>
                <ul className="mt-3 space-y-3">
                  {platformServices.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/75"
                        style={{
                          boxShadow:
                            "0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent)",
                        }}
                      />
                      <span className="text-sm leading-6 text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </PageContainer>
        </section>

        <section className="border-b border-border py-14 sm:py-16">
          <PageContainer>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {technicalHighlights.map((question) => (
                <article
                  key={question.title}
                  className="rounded-2xl border border-border bg-surface p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {question.eyebrow}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight">{question.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {question.description}
                  </p>
                </article>
              ))}
            </div>
          </PageContainer>
        </section>

        <section className="py-16 sm:py-20">
          <PageContainer>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Implementation Areas
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Implementation details behind the product surface
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                These sections summarize the behind-the-scenes work and point directly to the
                relevant repo files.
              </p>
            </div>

            <div className="mt-9 grid gap-5 xl:grid-cols-2">
              {technicalAreas.map((area) => (
                <article
                  key={area.id}
                  id={area.id}
                  className="scroll-mt-[calc(var(--site-header-h)+1rem)] rounded-2xl border border-border bg-surface p-6 sm:p-7"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {area.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">{area.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                    {area.description}
                  </p>

                  <ul className="mt-5 space-y-3">
                    {area.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                        <span className="text-sm leading-6 text-muted-foreground">{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Inspect In Repo
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {area.links.map((link) => (
                        <ActionLink key={`${area.id}-${link.label}`} link={link} />
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </PageContainer>
        </section>
      </div>
    </>
  );
}
