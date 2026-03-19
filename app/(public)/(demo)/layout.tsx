import type { Metadata } from "next";
import { JsonLd } from "@/src/components/seo/json-ld";
import { buildDemoSoftwareApplicationJsonLd, buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";

const demoDescription =
  "Interactive SaaS dashboard demonstration with guest-mode workflows, realistic interface behavior, and local-only demo data that resets on refresh.";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Live Demo",
  description: demoDescription,
  path: "/demo",
});

const demoPageJsonLd = buildWebPageJsonLd({
  title: "Live Demo",
  description: demoDescription,
  path: "/demo",
});

const demoApplicationJsonLd = buildDemoSoftwareApplicationJsonLd();

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={demoPageJsonLd} />
      <JsonLd data={demoApplicationJsonLd} />
      {children}
    </>
  );
}
