import type { LegalDocument } from "./types";
import { LEGAL_CONTACT_EMAIL, TERMS_EFFECTIVE_DATE, TERMS_VERSION } from "./legal-metadata";

export const termsDocument: LegalDocument = {
  meta: {
    eyebrow: "Legal",
    title: "Terms and Conditions",
    subtitle:
      "These terms govern your access to and use of SaaS Foundations Demo as a public demonstration application.",
    effectiveDate: TERMS_EFFECTIVE_DATE,
    lastUpdated: "February 23, 2026",
  },
  sections: [
    {
      id: "acceptance-of-terms",
      title: "Acceptance of terms",
      paragraphs: [
        "For account holders, acceptance occurs through the signup checkbox confirming agreement to these Terms and acknowledgement of the Privacy Policy (clickwrap acceptance).",
        "For casual visitors who do not create an account, these terms apply to the extent necessary to govern permitted access to public pages and prevent misuse.",
        "If you do not agree to these terms, do not create an account or use the service.",
      ],
    },
    {
      id: "service-description",
      title: "Service description",
      paragraphs: [
        "SaaS Foundations Demo is a portfolio and reference implementation showcasing common SaaS patterns and workflows.",
        "The service is provided for evaluation and demonstration purposes and may include simulated or limited functionality.",
      ],
      bullets: [
        "No production service level commitment or uptime guarantee is provided for this demo.",
        "Features, interfaces, and behavior may change without prior notice.",
      ],
    },
    {
      id: "eligibility-and-account-responsibilities",
      title: "Eligibility and account responsibilities",
      paragraphs: [
        "You are responsible for maintaining the confidentiality of your account credentials and for activity performed through your account.",
        "You agree to provide accurate information and to notify us promptly of unauthorized account access.",
      ],
    },
    {
      id: "acceptable-use-and-prohibited-conduct",
      title: "Acceptable use and prohibited conduct",
      paragraphs: [
        "You agree to use the service lawfully and in a manner that does not disrupt, damage, or abuse the platform or other users.",
      ],
      bullets: [
        "Do not attempt unauthorized access, security testing without permission, or service disruption.",
        "Do not use automation or abusive behavior to bypass rate limits or controls.",
        "Do not submit unlawful, malicious, or infringing content.",
      ],
    },
    {
      id: "intellectual-property",
      title: "Intellectual property",
      paragraphs: [
        "Unless otherwise stated, the service design, code, content, and branding are protected by intellectual property rights.",
        "No license is granted except the limited right to access and use the service under these terms.",
      ],
    },
    {
      id: "third-party-services",
      title: "Third-party services",
      paragraphs: [
        "The service may rely on third-party infrastructure and providers. Your use of integrated third-party capabilities may also be subject to those providers' terms.",
        "We are not responsible for third-party services outside our control.",
      ],
    },
    {
      id: "availability-modifications-and-suspension",
      title: "Availability, modifications, and suspension",
      paragraphs: [
        "We may modify, suspend, or discontinue any part of the service at any time, with or without notice.",
        "We may limit or suspend access where necessary for maintenance, security, abuse prevention, or operational reasons.",
      ],
    },
    {
      id: "disclaimers",
      title: "Disclaimers",
      paragraphs: [
        'The service is provided on an "as is" and "as available" basis, to the fullest extent permitted by applicable law.',
        "We disclaim warranties of any kind, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.",
      ],
    },
    {
      id: "limitation-of-liability",
      title: "Limitation of liability",
      paragraphs: [
        "To the fullest extent permitted by applicable law, we are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.",
        "To the fullest extent permitted by applicable law, our aggregate liability for claims arising out of or related to the service will not exceed USD 100 (or the equivalent amount in local currency).",
        "Nothing in these terms excludes or limits liability that cannot be excluded under applicable law, including non-waivable consumer rights where they apply.",
      ],
    },
    {
      id: "indemnification",
      title: "Indemnification",
      paragraphs: [
        "You agree to indemnify and hold harmless the service operator from claims, liabilities, damages, and expenses arising from your misuse of the service or violation of these terms.",
      ],
    },
    {
      id: "termination",
      title: "Termination",
      paragraphs: [
        "You may stop using the service at any time. We may suspend or terminate access if we reasonably believe these terms have been violated or if needed for security and operational integrity.",
      ],
    },
    {
      id: "dispute-resolution",
      title: "Dispute resolution",
      paragraphs: [
        "Before initiating formal proceedings, parties should attempt to resolve disputes in good faith by contacting each other with sufficient detail to investigate and respond.",
        "Any dispute that cannot be resolved informally will be handled under applicable law and in an appropriate forum, without selecting a specific jurisdiction in these terms.",
      ],
    },
    {
      id: "changes-to-these-terms",
      title: "Changes to these terms",
      paragraphs: [
        "We may update these terms from time to time.",
        "Non-material updates may become effective when posted. For material updates, we will provide at least 30 days' advance notice through reasonable channels before the updated terms take effect, unless a shorter timeline is required by law or security necessity.",
        "The most recent version and date controls going forward.",
        `Current version: ${TERMS_VERSION}.`,
        `Effective date: ${TERMS_EFFECTIVE_DATE}.`,
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        "For questions about these terms, contact us using the email below or the contact page.",
        `Email: ${LEGAL_CONTACT_EMAIL}`,
        "Contact page: /contact",
      ],
    },
  ],
};
