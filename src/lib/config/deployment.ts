export type DeploymentTarget = "development" | "test" | "preview" | "production";

export type ResolvedAppUrlSource = "explicit" | "vercel-preview" | "local-default";

export interface ResolvedAppUrl {
  origin: string;
  source: ResolvedAppUrlSource;
}

export type AppUrlResolution = { ok: true; value: ResolvedAppUrl } | { ok: false; message: string };

type EnvironmentMap = Record<string, string | undefined>;

const LOCAL_FALLBACK_APP_URL = "http://localhost:3000";

function normalizeEnvValue(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toAbsoluteHttpOrigin(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

function toPreviewDeploymentOrigin(rawValue: string): string | null {
  const candidate = /^[a-z]+:\/\//i.test(rawValue) ? rawValue : `https://${rawValue}`;
  return toAbsoluteHttpOrigin(candidate);
}

export function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getDeploymentTarget(env: EnvironmentMap = process.env): DeploymentTarget {
  const nodeEnv = normalizeEnvValue(env.NODE_ENV)?.toLowerCase();
  const vercelEnv = normalizeEnvValue(env.VERCEL_ENV)?.toLowerCase();

  if (nodeEnv === "test") {
    return "test";
  }

  if (vercelEnv === "production") {
    return "production";
  }

  if (vercelEnv === "preview") {
    return "preview";
  }

  if (nodeEnv === "production") {
    return "production";
  }

  return "development";
}

export function isProductionDeployment(env: EnvironmentMap = process.env): boolean {
  return getDeploymentTarget(env) === "production";
}

export function isDeployedEnvironment(env: EnvironmentMap = process.env): boolean {
  const target = getDeploymentTarget(env);
  return target === "preview" || target === "production";
}

export function resolveAppUrl(env: EnvironmentMap = process.env): AppUrlResolution {
  const configuredAppUrl = normalizeEnvValue(env.NEXT_PUBLIC_APP_URL);
  if (configuredAppUrl) {
    const origin = toAbsoluteHttpOrigin(configuredAppUrl);
    if (origin) {
      return {
        ok: true,
        value: {
          origin,
          source: "explicit",
        },
      };
    }

    return {
      ok: false,
      message: "NEXT_PUBLIC_APP_URL must be an absolute http(s) URL.",
    };
  }

  const target = getDeploymentTarget(env);
  if (target === "preview") {
    const previewDeploymentUrl = normalizeEnvValue(env.VERCEL_URL);
    if (!previewDeploymentUrl) {
      return {
        ok: false,
        message:
          "NEXT_PUBLIC_APP_URL is required for preview deployments when VERCEL_URL is unavailable.",
      };
    }

    const origin = toPreviewDeploymentOrigin(previewDeploymentUrl);
    if (!origin) {
      return {
        ok: false,
        message:
          "VERCEL_URL must resolve to an absolute http(s) URL when NEXT_PUBLIC_APP_URL is unset.",
      };
    }

    return {
      ok: true,
      value: {
        origin,
        source: "vercel-preview",
      },
    };
  }

  if (target === "development" || target === "test") {
    return {
      ok: true,
      value: {
        origin: LOCAL_FALLBACK_APP_URL,
        source: "local-default",
      },
    };
  }

  return {
    ok: false,
    message: "NEXT_PUBLIC_APP_URL is required for production deployments.",
  };
}

export function getRequiredAppUrl(env: EnvironmentMap = process.env): string {
  const appUrl = resolveAppUrl(env);
  if (!appUrl.ok) {
    throw new Error(`[config] ${appUrl.message}`);
  }

  return appUrl.value.origin;
}

export function getRequiredSiteUrl(env: EnvironmentMap = process.env): URL {
  return new URL(getRequiredAppUrl(env));
}
