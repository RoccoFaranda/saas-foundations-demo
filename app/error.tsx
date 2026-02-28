"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BackButton } from "@/src/components/error/back-button";
import { PageContainer } from "@/src/components/layout/page-container";
import { getSupportEmail } from "@/src/lib/config/support-email";
import { reportAppError } from "@/src/lib/observability/report-app-error";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const supportEmail = getSupportEmail();
  const supportSubject = error.digest
    ? `Support request (Ref: ${error.digest})`
    : "Support request";
  const supportBody = error.digest
    ? `Reference ID: ${error.digest}\n\nWhat were you doing when this happened?`
    : "What were you doing when this happened?";
  const supportHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject)}&body=${encodeURIComponent(supportBody)}`
    : null;

  useEffect(() => {
    reportAppError({ boundary: "segment", error });
  }, [error]);

  return (
    <div className="py-16 sm:py-20">
      <PageContainer size="narrow">
        <section className="rounded-2xl border border-border bg-surface p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Unexpected error
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            We hit an unexpected problem while loading this page.
          </p>

          {error.digest ? (
            <p className="mt-3 rounded-md border border-border bg-muted/45 px-3 py-2 text-xs text-muted-foreground sm:text-sm">
              Reference ID: <span className="font-mono text-foreground">{error.digest}</span>
              <br />
              Please include this ID in your support email.
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => reset()} className="btn-primary btn-md">
              Refresh page
            </button>
            <BackButton className="btn-secondary btn-md" />
            <Link href="/" className="btn-secondary btn-md">
              Go Home
            </Link>
            {supportHref ? (
              <a href={supportHref} className="btn-outline btn-md">
                Email Support
              </a>
            ) : null}
          </div>
          {supportHref ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Support email:{" "}
              <a href={supportHref} className="focus-ring font-mono text-link hover:underline">
                {supportEmail}
              </a>
            </p>
          ) : null}
        </section>
      </PageContainer>
    </div>
  );
}
