const RETRYABLE_STATUS_CODES = new Set([401, 403, 429, 500, 502, 503, 504]);

interface LinkIdentityOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  fetchImpl?: typeof fetch;
}

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function getRetryDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number) {
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(maxDelayMs, exponential);
}

export async function linkIdentityWithRetry({
  maxAttempts = 3,
  baseDelayMs = 200,
  maxDelayMs = 1000,
  fetchImpl = fetch,
}: LinkIdentityOptions = {}): Promise<boolean> {
  const safeMaxAttempts = Math.max(1, maxAttempts);
  const safeBaseDelayMs = Math.max(0, baseDelayMs);
  const safeMaxDelayMs = Math.max(safeBaseDelayMs, maxDelayMs);

  for (let attempt = 1; attempt <= safeMaxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl("/api/consent/link", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
      });

      if (response.ok) {
        return true;
      }

      const shouldRetry = RETRYABLE_STATUS_CODES.has(response.status) && attempt < safeMaxAttempts;
      if (!shouldRetry) {
        console.warn(
          `[consent] Identity link request failed with status ${response.status}; not retrying.`
        );
        return false;
      }
    } catch (error) {
      if (attempt >= safeMaxAttempts) {
        console.warn("[consent] Identity link request failed after retries:", error);
        return false;
      }
    }

    const delayMs = getRetryDelayMs(attempt, safeBaseDelayMs, safeMaxDelayMs);
    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return false;
}
