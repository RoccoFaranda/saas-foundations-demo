import Link from "next/link";
import { PageContainer } from "@/src/components/layout/page-container";

interface MarketingPlaceholderPageProps {
  title: string;
  description: string;
}

export function MarketingPlaceholderPage({ title, description }: MarketingPlaceholderPageProps) {
  return (
    <div className="py-16 sm:py-20">
      <PageContainer
        size="narrow"
        className="rounded-2xl border border-border bg-muted/40 p-8 sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Coming Next
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/" className="btn-primary btn-md">
            Back to Landing
          </Link>
          <Link
            href="/demo"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-border-strong"
          >
            Open Demo App
          </Link>
        </div>
      </PageContainer>
    </div>
  );
}
