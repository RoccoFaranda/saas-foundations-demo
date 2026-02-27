import {
  GITHUB_PROFILE_URL,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_PERSON_NAME,
  UPWORK_PROFILE_URL,
} from "@/src/content/profile/public-metadata";
import { SITE_DESCRIPTION, SITE_NAME, getAbsoluteUrl } from "./metadata";

type JsonLdObject = Record<string, unknown>;

export function buildWebsiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    url: getAbsoluteUrl("/"),
  };
}

export function buildPersonJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: PUBLIC_PERSON_NAME,
    email: `mailto:${PUBLIC_CONTACT_EMAIL}`,
    url: getAbsoluteUrl("/contact"),
    sameAs: [GITHUB_PROFILE_URL, UPWORK_PROFILE_URL],
    jobTitle: "Full-stack Developer",
  };
}

type WebPageJsonLdOptions = {
  title: string;
  description: string;
  path: string;
};

export function buildWebPageJsonLd({
  title,
  description,
  path,
}: WebPageJsonLdOptions): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: getAbsoluteUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: getAbsoluteUrl("/"),
    },
  };
}

export function buildDemoSoftwareApplicationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Interactive SaaS demo with guest mode, authenticated dashboard flows, and account lifecycle features.",
    url: getAbsoluteUrl("/demo"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}
