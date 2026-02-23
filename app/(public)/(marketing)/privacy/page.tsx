import type { Metadata } from "next";
import { privacyDocument } from "@/src/content/legal/privacy";
import { LegalDocumentPage } from "@/src/components/legal/legal-document-page";

export const metadata: Metadata = {
  title: "Privacy Policy | SaaS Foundations Demo",
  description: "How SaaS Foundations Demo collects, uses, stores, and protects personal data.",
};

export default function PrivacyPage() {
  return <LegalDocumentPage document={privacyDocument} />;
}
