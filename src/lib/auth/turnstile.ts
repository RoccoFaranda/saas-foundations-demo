import "server-only";

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
