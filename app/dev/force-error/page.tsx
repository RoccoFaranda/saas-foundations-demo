import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/src/components/layout/page-container";
import { NO_INDEX_ROBOTS } from "@/src/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Force Runtime Error",
  description: "Test-only route for validating App Router runtime error boundaries.",
  robots: NO_INDEX_ROBOTS,
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = params[key];
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0] ?? null;
  }

  return null;
}

export default async function ForceErrorPage({ searchParams }: PageProps) {
  const isProduction = process.env.NODE_ENV === "production";
  const allowInProduction = process.env.ALLOW_ERROR_TEST_ROUTE_IN_PROD === "true";
  const isErrorTestRouteEnabled =
    process.env.ENABLE_ERROR_TEST_ROUTE === "true" && (!isProduction || allowInProduction);

  if (!isErrorTestRouteEnabled) {
    notFound();
  }

  const params = await searchParams;
  const mode = readSearchParam(params, "mode");

  if (mode === "runtime") {
    throw new Error("FORCED_RUNTIME_ERROR_FOR_E2E");
  }

  return (
    <div className="py-16 sm:py-20">
      <PageContainer size="narrow">
        <section className="rounded-2xl border border-border bg-surface p-8 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Test route
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Runtime error simulator
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Use this route in automated tests to validate custom App Router runtime error pages.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dev/force-error?mode=runtime" className="btn-primary btn-md">
              Trigger runtime error
            </Link>
            <Link href="/" className="btn-secondary btn-md">
              Go Home
            </Link>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
