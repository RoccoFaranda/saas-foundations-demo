import { SiteHeader } from "@/src/components/site-header";
import { SiteFooter } from "@/src/components/site-footer";
import { JsonLd } from "@/src/components/seo/json-ld";
import { buildPersonJsonLd, buildWebsiteJsonLd } from "@/src/lib/seo/json-ld";

const websiteJsonLd = buildWebsiteJsonLd();
const personJsonLd = buildPersonJsonLd();

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={personJsonLd} />
      <div className="flex min-h-screen flex-col [--site-header-h:3.5rem]">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </>
  );
}
