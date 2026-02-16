import { PageContainer } from "./layout/page-container";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <PageContainer className="flex h-14 items-center justify-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SaaS Foundations Demo</p>
      </PageContainer>
    </footer>
  );
}
