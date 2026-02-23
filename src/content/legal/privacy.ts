import type { LegalDocument } from "./types";
import {
  LEGAL_CONTACT_ADDRESS,
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTROLLER_NAME,
  LEGAL_DPO_CONTACT,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_VERSION,
} from "./legal-metadata";

const controllerContactParagraphs = [
  `Data controller: ${LEGAL_CONTROLLER_NAME}.`,
  `Primary privacy contact: ${LEGAL_CONTACT_EMAIL}.`,
  ...(LEGAL_CONTACT_ADDRESS ? [`Postal contact address: ${LEGAL_CONTACT_ADDRESS}.`] : []),
  ...(LEGAL_DPO_CONTACT
    ? [`Data protection representative / DPO contact (if appointed): ${LEGAL_DPO_CONTACT}.`]
    : [
        "A separate data protection officer is not currently appointed for this demo. If that changes, this policy will be updated.",
      ]),
];

export const privacyDocument: LegalDocument = {
  meta: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    subtitle:
      "This policy explains how SaaS Foundations Demo collects, uses, and protects personal data in this public demo application.",
    effectiveDate: PRIVACY_EFFECTIVE_DATE,
    lastUpdated: "February 23, 2026",
  },
  sections: [
    {
      id: "controller-details-and-contact-methods",
      title: "Controller details and contact methods",
      paragraphs: [
        "SaaS Foundations Demo is a public, portfolio-grade demonstration of SaaS product foundations. This Privacy Policy applies to personal data processed through the website, demo routes, and account flows.",
        ...controllerContactParagraphs,
      ],
    },
    {
      id: "data-categories-we-process",
      title: "Data categories we process",
      paragraphs: [
        "We process personal data needed to provide account functionality, maintain security, and run the service reliably.",
        "The categories below reflect what we process depending on your interaction with the demo.",
      ],
      bullets: [
        "Account data: email address, hashed password, email verification state, profile fields if provided.",
        "Security data: token lifecycle records for verification, password reset, email change, and account restore flows.",
        "Usage and system data: request context for rate limiting and abuse prevention, plus error and operational logs.",
        "Preference data: theme preferences stored for UX continuity.",
      ],
    },
    {
      id: "purposes-and-legal-bases",
      title: "Purposes and legal bases",
      paragraphs: [
        "We use personal data to provide and secure core product behavior, including authentication, account management, and service reliability.",
        "Where applicable, legal bases include performance of a contract, legitimate interests (for security and operations), and consent where required by local law.",
      ],
      bullets: [
        "Create and maintain user accounts.",
        "Authenticate users and protect account access.",
        "Send transactional account emails such as verification and password reset messages.",
        "Apply abuse prevention controls such as bot protection and rate limiting.",
        "Diagnose incidents, monitor service health, and improve product quality.",
      ],
    },
    {
      id: "required-data-and-consequences",
      title: "Required data and consequences",
      paragraphs: [
        "Certain data fields are required to operate account and security features. If required data is not provided, related features may not function.",
        "For example, account creation requires a valid email, password, and acceptance of legal terms. Password-reset and verification flows require the associated account email and valid tokens.",
        "Optional profile or preference fields are not required for core authentication.",
      ],
    },
    {
      id: "cookies-and-local-storage",
      title: "Cookies and local storage",
      paragraphs: [
        "The application uses storage technologies needed for core functionality and experience continuity, including authentication/session behavior and theme preference persistence.",
        "Detailed non-essential cookie preference controls and consent management are handled in a dedicated cookie-consent implementation phase.",
      ],
      bullets: [
        "Session and authentication state support.",
        "Theme and display preference persistence.",
        "Security and abuse prevention operations.",
      ],
    },
    {
      id: "do-not-track-and-cross-site-signals",
      title: "Do not track and cross-site signals",
      paragraphs: [
        "At this time, the service does not change behavior in response to browser Do Not Track (DNT) signals.",
        "In jurisdictions where this disclosure is required (including California), we disclose that the demo is not used to enable third-party advertising networks to track users across unrelated third-party websites over time. Infrastructure providers may still receive technical request data as part of delivering the service.",
      ],
    },
    {
      id: "recipients-and-processors",
      title: "Recipients and processors",
      paragraphs: [
        "We use service providers to operate this demo. These providers act as processors or independent controllers depending on their role and applicable law.",
        "Provider usage may change over time as the demo evolves. Current categories include infrastructure, data storage, email delivery, and abuse prevention services.",
      ],
      bullets: [
        "Hosting and application delivery infrastructure.",
        "Managed database services.",
        "Transactional email delivery services.",
        "Rate limiting and bot protection services.",
      ],
    },
    {
      id: "international-transfers-and-safeguards",
      title: "International transfers and safeguards",
      paragraphs: [
        "Because providers may operate globally, personal data may be processed in countries outside your own.",
        "When transfers occur, we rely on safeguards appropriate to the transfer context and applicable law, including adequacy decisions, standard contractual clauses (SCCs), the UK International Data Transfer Addendum (or IDTA where relevant), and supplementary measures where required.",
        "Where legally required, we perform transfer risk assessments and implement contractual and technical protections proportionate to transfer risk.",
      ],
    },
    {
      id: "data-retention",
      title: "Data retention",
      paragraphs: [
        "We retain personal data only as long as needed for service delivery, security operations, legal obligations, dispute resolution, and enforcement.",
        "Retention windows vary by data category. Data no longer needed is deleted or anonymized when practical.",
      ],
    },
    {
      id: "security-measures",
      title: "Security measures",
      paragraphs: [
        "We implement technical and organizational safeguards designed for a modern web application, including secure credential handling and abuse protection controls.",
        "No system is absolutely secure, but we apply proportionate controls and continuously improve security posture.",
      ],
      bullets: [
        "Password hashing and secure token handling.",
        "Input validation and request-level safeguards.",
        "Rate limiting and bot mitigation on sensitive flows.",
        "Restricted handling of sensitive logs and secrets.",
      ],
    },
    {
      id: "your-rights-and-choices",
      title: "Your rights and choices",
      paragraphs: [
        "Depending on your location, you may have rights related to access, correction, deletion, portability, objection, or restriction of processing.",
        "You may request account deletion through account controls or by contacting us. We may ask for identity verification before completing a request.",
      ],
    },
    {
      id: "complaints-and-supervisory-authorities",
      title: "Complaints and supervisory authorities",
      paragraphs: [
        "If you believe your privacy rights were not handled appropriately, you may contact us first so we can attempt to resolve the issue quickly.",
        "UK users may lodge a complaint with the UK Information Commissioner's Office (ICO): https://ico.org.uk/make-a-complaint/",
        "EEA users may contact their local supervisory authority. A current member list is available from the European Data Protection Board: https://www.edpb.europa.eu/about-edpb/about-edpb/members_en",
      ],
    },
    {
      id: "automated-decision-making",
      title: "Automated decision-making",
      paragraphs: [
        "The service does not currently make solely automated decisions that produce legal effects or similarly significant effects about users.",
        "If this changes, this policy will be updated before or at the time such processing is introduced.",
      ],
    },
    {
      id: "childrens-privacy",
      title: "Children's privacy",
      paragraphs: [
        "This service is not directed to children and is intended for professional portfolio and product evaluation use.",
        "If you believe a child has submitted personal data, contact us and we will review and address the report promptly.",
      ],
    },
    {
      id: "changes-to-this-policy",
      title: "Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy as the service evolves, legal requirements change, or providers are updated.",
        "Non-material changes may take effect when posted. If a change is material, we will provide additional notice through reasonable channels before the updated policy takes effect.",
        `Current version: ${PRIVACY_VERSION}.`,
        `Effective date: ${PRIVACY_EFFECTIVE_DATE}.`,
      ],
    },
    {
      id: "contact",
      title: "Contact",
      paragraphs: [
        "For privacy-related questions or requests, contact us using the legal email below or the contact page.",
        `Email: ${LEGAL_CONTACT_EMAIL}`,
        "Contact page: /contact",
      ],
    },
  ],
};
