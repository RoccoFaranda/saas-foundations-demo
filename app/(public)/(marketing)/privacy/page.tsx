import type { Metadata } from "next";
import { privacyDocument } from "@/src/content/legal/privacy";
import { LegalDocumentPage } from "@/src/components/legal/legal-document-page";
import { JsonLd } from "@/src/components/seo/json-ld";
import { buildWebPageJsonLd } from "@/src/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/src/lib/seo/metadata";

const privacyDescription =
  "Privacy policy describing how SaaS Foundations Demo processes account, security, and preference data, including cookies, retention, safeguards, and user rights.";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Privacy Policy",
  description: privacyDescription,
  path: "/privacy",
});

const webPageJsonLd = buildWebPageJsonLd({
  title: "Privacy Policy",
  description: privacyDescription,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd} />
      <LegalDocumentPage document={privacyDocument} />
    </>
  );
}
