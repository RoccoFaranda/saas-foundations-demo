import { logAuthEvent } from "./logging";

const DEV_FALLBACK_URL = "http://localhost:3000";

function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getAppUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const isProduction = isProductionEnv();

  if (!rawUrl) {
    if (!isProduction) {
      return DEV_FALLBACK_URL;
    }

    logAuthEvent("app_url_missing");
    throw new Error("[config] NEXT_PUBLIC_APP_URL is required to build absolute links.");
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_APP_URL must start with http or https.");
    }
    return parsed.origin;
  } catch (error) {
    if (!isProduction) {
      return DEV_FALLBACK_URL;
    }

    logAuthEvent("app_url_missing");
    console.error("[config] NEXT_PUBLIC_APP_URL is invalid.", error);
    throw new Error(`[config] NEXT_PUBLIC_APP_URL is invalid: ${rawUrl}`);
  }
}
