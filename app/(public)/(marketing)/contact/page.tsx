import type { Metadata } from "next";
import { ExternalLinkMark } from "@/src/components/icons/external-link-mark";
import { GitHubMark } from "@/src/components/icons/github-mark";
import { MailMark } from "@/src/components/icons/mail-mark";
import { PageContainer } from "@/src/components/layout/page-container";
import { JsonLd } from "@/src/components/seo/json-ld";
import {
  GITHUB_PROFILE_URL,
  PUBLIC_CONTACT_EMAIL,
  UPWORK_PROFILE_URL,
} from "@/src/content/profile/public-metadata";
import { buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";

const contactDescription =
  "Contact information and engagement details for UK-based freelance and contract SaaS development, including availability and project intake expectations.";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Contact",
  description: contactDescription,
  path: "/contact",
});

const webPageJsonLd = buildWebPageJsonLd({
  title: "Contact",
  description: contactDescription,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <div className="py-16 sm:py-20">
        <PageContainer>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
            <section className="h-full rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:col-span-8">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Contact
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Work with me
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                I&apos;m a UK-based full-stack developer building modern SaaS web applications.
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                First-Class BSc (Computer Science) with several years of commercial software
                experience.
              </p>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Email: <span className="font-mono text-foreground">{PUBLIC_CONTACT_EMAIL}</span>
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
                  className="btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <MailMark className="h-3.5 w-3.5" />
                  Email me
                </a>
                <a
                  href={UPWORK_PROFILE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5"
                >
                  <ExternalLinkMark className="h-3.5 w-3.5" />
                  Hire me on Upwork
                </a>
                <a
                  href={GITHUB_PROFILE_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-secondary btn-sm inline-flex items-center gap-1.5"
                >
                  <GitHubMark className="h-3.5 w-3.5" />
                  GitHub Profile
                </a>
              </div>
            </section>

            <section className="h-full rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:col-span-4">
              <h2 className="text-xl font-semibold tracking-tight">Availability</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
                <li>UK timezone</li>
                <li>Typical response time: 1-2 business days</li>
                <li>Open to freelance and contract work</li>
                <li>Flexible scope: one-off features or ongoing support</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8 lg:col-span-12">
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">What I can help with</h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
                    <li>End-to-end SaaS builds (Next.js, TypeScript, Postgres/Prisma)</li>
                    <li>Auth, account lifecycle, dashboards, and app UX</li>
                    <li>Refactors, feature delivery, and production hardening</li>
                    <li>Test coverage and release confidence (unit + E2E)</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    When you reach out, include
                  </h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground sm:text-base">
                    <li>Project scope and goals</li>
                    <li>Timeline and target launch window</li>
                    <li>Budget range (if available)</li>
                    <li>Stack or platform constraints</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </PageContainer>
      </div>
    </>
  );
}
