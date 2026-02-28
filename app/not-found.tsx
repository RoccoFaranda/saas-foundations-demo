import Link from "next/link";
import { BackButton } from "@/src/components/error/back-button";
import { PageContainer } from "@/src/components/layout/page-container";
import { getSupportEmail } from "@/src/lib/config/support-email";

export default function NotFound() {
  const supportEmail = getSupportEmail();

  return (
    <div className="py-16 sm:py-20">
      <PageContainer size="narrow">
        <section className="rounded-2xl border border-border bg-surface p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            404
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Page not found</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            The page you requested does not exist or may have moved.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/" className="btn-primary btn-md">
              Go Home
            </Link>
            <BackButton className="btn-secondary btn-md" />
            {supportEmail ? (
              <a href={`mailto:${supportEmail}`} className="btn-outline btn-md">
                Email Support
              </a>
            ) : null}
          </div>
          {supportEmail ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Support email:{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="focus-ring font-mono text-link hover:underline"
              >
                {supportEmail}
              </a>
            </p>
          ) : null}
        </section>
      </PageContainer>
    </div>
  );
}
