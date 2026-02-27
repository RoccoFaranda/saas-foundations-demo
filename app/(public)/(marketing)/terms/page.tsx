import type { Metadata } from "next";
import { termsDocument } from "@/src/content/legal/terms";
import { LegalDocumentPage } from "@/src/components/legal/legal-document-page";
import { JsonLd } from "@/src/components/seo/json-ld";
import { buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Terms and Conditions",
  description: "Terms governing access to and use of SaaS Foundations Demo.",
  path: "/terms",
});

const webPageJsonLd = buildWebPageJsonLd({
  title: "Terms and Conditions",
  description: "Terms governing access to and use of SaaS Foundations Demo.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <LegalDocumentPage document={termsDocument} />
    </>
  );
}
