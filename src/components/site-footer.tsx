import { LegalInlineLinks } from "./legal/legal-inline-links";
import { PageContainer } from "./layout/page-container";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <PageContainer className="py-4">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-muted-foreground">
          <span>
            &copy; {new Date().getFullYear()} SaaS Foundations Demo &bull; Built by Rocco Faranda
          </span>
          <span aria-hidden="true">&bull;</span>
          <LegalInlineLinks variant="footer" />
        </div>
      </PageContainer>
    </footer>
  );
}
