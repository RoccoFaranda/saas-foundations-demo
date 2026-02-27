import type { Metadata } from "next";
import { MarketingPlaceholderPage } from "@/src/components/marketing/marketing-placeholder-page";
import { JsonLd } from "@/src/components/seo/json-ld";
import { buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Features",
  description:
    "Product-style feature breakdown covering dashboard workflows, auth lifecycle, analytics, and demo-safe behavior.",
  path: "/features",
});

const webPageJsonLd = buildWebPageJsonLd({
  title: "Features",
  description:
    "Product-style feature breakdown covering dashboard workflows, auth lifecycle, analytics, and demo-safe behavior.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <MarketingPlaceholderPage
        title="Features"
        description="This page will expand into a product-style breakdown of dashboard workflows, auth flows, analytics, and demo-safe behavior."
      />
    </>
  );
}
