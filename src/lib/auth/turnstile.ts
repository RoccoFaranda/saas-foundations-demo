import "server-only";

export type TurnstilePolicy = {
  validSiteKey: boolean;
  validSecretKey: boolean;
  configured: boolean;
  required: boolean;
  bypass: boolean;
  widgetEnabled: boolean;
};

let warnedTurnstileBypass = false;
let warnedTurnstileMisconfigured = false;

function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const TEST_SITE_KEYS = new Set([
  "1x00000000000000000000AA",
  "2x00000000000000000000AB",
  "1x00000000000000000000BB",
  "2x00000000000000000000BB",
  "3x00000000000000000000FF",
]);

const TEST_SECRET_KEYS = new Set([
  "1x0000000000000000000000000000000AA",
  "2x0000000000000000000000000000000AA",
  "3x0000000000000000000000000000000AA",
]);

function isLikelyTurnstileKey(
  value: string,
  minLength: number,
  knownTestKeys: Set<string>,
  allowTestKeys: boolean
) {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (knownTestKeys.has(trimmed)) {
    return allowTestKeys;
  }
  if (trimmed.length < minLength) {
    return false;
  }
  if (/\s/.test(trimmed)) {
    return false;
  }
  return true;
}

export function getTurnstilePolicy(): TurnstilePolicy {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  const allowTestKeys = process.env.NODE_ENV !== "production";
  const validSiteKey = isLikelyTurnstileKey(siteKey, 20, TEST_SITE_KEYS, allowTestKeys);
  const validSecretKey = isLikelyTurnstileKey(secretKey, 32, TEST_SECRET_KEYS, allowTestKeys);
  const bypass = parseBooleanEnv(process.env.TURNSTILE_ALLOW_BYPASS);
  const required = process.env.NODE_ENV === "production" && !bypass;

  if (process.env.NODE_ENV !== "test") {
    if (bypass && !warnedTurnstileBypass) {
      warnedTurnstileBypass = true;
      console.warn("[turnstile] Bypass enabled; verification is disabled.");
    }

    if (required && !(validSiteKey && validSecretKey) && !warnedTurnstileMisconfigured) {
      warnedTurnstileMisconfigured = true;
      console.warn("[turnstile] Required but misconfigured; signups will be blocked.", {
        validSiteKey,
        validSecretKey,
      });
    }
  }

  return {
    validSiteKey,
    validSecretKey,
    configured: validSiteKey && validSecretKey,
    required,
    bypass,
    widgetEnabled: validSiteKey && validSecretKey && !bypass,
  };
}

/**
 * Verify a Cloudflare Turnstile token
 * Returns true if verification succeeds, false otherwise
 * Never logs tokens or secrets
 */
export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If no secret key configured, skip verification (dev/test)
  if (!secretKey) {
    return process.env.NODE_ENV !== "production";
  }

  // If no token provided, fail verification
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return false;
  }

  try {
    const body = new URLSearchParams({
      secret: secretKey,
      response: token.trim(),
    });

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Fail closed: if verification errors, reject the request
    // Don't log the error details to avoid exposing tokens
    return false;
  }
}
