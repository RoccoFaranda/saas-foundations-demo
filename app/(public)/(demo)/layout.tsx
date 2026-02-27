import type { Metadata } from "next";
import { JsonLd } from "@/src/components/seo/json-ld";
import { buildDemoSoftwareApplicationJsonLd, buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Live Demo",
  description:
    "Interactive guest dashboard with realistic SaaS behaviors. Local demo changes reset on refresh.",
  path: "/demo",
});

const demoPageJsonLd = buildWebPageJsonLd({
  title: "Live Demo",
  description:
    "Interactive guest dashboard with realistic SaaS behaviors. Local demo changes reset on refresh.",
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
