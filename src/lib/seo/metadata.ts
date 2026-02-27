import type { Metadata } from "next";

export const SITE_NAME = "SaaS Foundations Demo";
export const SITE_DESCRIPTION = "A production-style SaaS demo showcasing core app and auth flows.";

const DEV_FALLBACK_SITE_URL = "http://localhost:3000";

export const NO_INDEX_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
};

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getSiteUrl(): URL {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isProduction = isProductionEnv();

  if (!rawUrl) {
    if (isProduction) {
      throw new Error("[config] NEXT_PUBLIC_APP_URL is required for metadata in production.");
    }
    return new URL(DEV_FALLBACK_SITE_URL);
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_APP_URL must start with http or https.");
    }
    return new URL(parsed.origin);
  } catch {
    if (isProduction) {
      throw new Error(`[config] NEXT_PUBLIC_APP_URL is invalid: ${rawUrl}`);
    }
    return new URL(DEV_FALLBACK_SITE_URL);
  }
}

export function getAbsoluteUrl(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, getSiteUrl()).toString();
}

type PublicPageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
};

export function buildPublicPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: PublicPageMetadataOptions): Metadata {
  const canonical = getAbsoluteUrl(path);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

type PrivatePageMetadataOptions = {
  title: string;
  description?: string;
};

export function buildPrivatePageMetadata({
  title,
  description,
}: PrivatePageMetadataOptions): Metadata {
  return {
    title,
    description,
    robots: NO_INDEX_ROBOTS,
  };
}
