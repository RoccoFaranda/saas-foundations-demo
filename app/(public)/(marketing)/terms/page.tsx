import type { Metadata } from "next";
import { termsDocument } from "@/src/content/legal/terms";
import { LegalDocumentPage } from "@/src/components/legal/legal-document-page";
import { JsonLd } from "@/src/components/seo/json-ld";
import { buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";

const termsDescription =
  "Terms and conditions governing access to and use of SaaS Foundations Demo, including acceptable use, service limitations, third-party services, and liability boundaries.";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Terms and Conditions",
  description: termsDescription,
  path: "/terms",
});

const webPageJsonLd = buildWebPageJsonLd({
  title: "Terms and Conditions",
  description: termsDescription,
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
