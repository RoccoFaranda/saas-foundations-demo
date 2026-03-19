import type { Metadata } from "next";
import { CookieTable } from "@/src/components/consent/cookie-table";
import { PageContainer } from "@/src/components/layout/page-container";
import { JsonLd } from "@/src/components/seo/json-ld";
import { HAS_NON_ESSENTIAL_CONSENT_SERVICES } from "@/src/lib/consent/services";
import { buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";
import {
  COOKIE_DECLARATION_EFFECTIVE_DATE,
  COOKIE_DECLARATION_LAST_UPDATED,
} from "@/src/content/legal/legal-metadata";

const cookiesDescription =
  "Cookie declaration listing the storage technologies currently used by SaaS Foundations Demo, including essential categories, optional services, purposes, and effective dates.";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Cookie Declaration",
  description: cookiesDescription,
  path: "/cookies",
});

const webPageJsonLd = buildWebPageJsonLd({
  title: "Cookie Declaration",
  description: cookiesDescription,
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <div className="py-16 sm:py-20">
        <PageContainer className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Legal
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Cookie Declaration
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              This table lists active cookies and related storage technologies currently used in
              SaaS Foundations Demo.
            </p>

            <div className="mt-5 rounded-lg border border-border bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
              <dl className="grid gap-1">
                <div className="flex flex-wrap gap-1">
                  <dt className="font-medium text-foreground">Effective date:</dt>
                  <dd>{COOKIE_DECLARATION_EFFECTIVE_DATE}</dd>
                </div>
                <div className="flex flex-wrap gap-1">
                  <dt className="font-medium text-foreground">Last updated:</dt>
                  <dd>{COOKIE_DECLARATION_LAST_UPDATED}</dd>
                </div>
              </dl>
            </div>

            {HAS_NON_ESSENTIAL_CONSENT_SERVICES ? (
              <p className="mt-4 rounded-lg border border-border bg-muted/45 px-3 py-2 text-sm text-muted-foreground">
                Optional technologies are currently active in this release and shown below with
                their disclosure metadata.
              </p>
            ) : (
              <p className="mt-4 rounded-lg border border-border bg-muted/45 px-3 py-2 text-sm text-muted-foreground">
                No optional categories are currently active in this release. The table still
                includes required technologies needed for core service operation.
              </p>
            )}

            <CookieTable variant="page" className="mt-6" showOptionalStatusNote={false} />
          </section>
        </PageContainer>
      </div>
    </>
  );
}
