import type { Metadata } from "next";
import { termsDocument } from "@/src/content/legal/terms";
import { LegalDocumentPage } from "@/src/components/legal/legal-document-page";

export const metadata: Metadata = {
  title: "Terms and Conditions | SaaS Foundations Demo",
  description: "Terms governing use of SaaS Foundations Demo.",
};

export default function TermsPage() {
  return <LegalDocumentPage document={termsDocument} />;
}
