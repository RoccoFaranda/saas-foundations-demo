const CONSENT_AUDIT_QUEUE_STORAGE_KEY = "sf-consent-audit-queue:v2";
const MAX_QUEUE_ITEMS = 200;
const MAX_QUEUE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

const RETRYABLE_STATUS_CODES = new Set([401, 500, 502, 503, 504]);
const NON_RETRYABLE_STATUS_CODES = new Set([400, 403, 404, 405, 409, 410, 422, 429]);

export type ConsentAuditQueueItemKind = "consent" | "identity_link";

interface ConsentAuditQueueItem {
  kind: ConsentAuditQueueItemKind;
  eventId: string;
  replayToken: string;
  attemptCount: number;
  queuedAt: string;
  nextAttemptAt: number;
}

interface FlushConsentAuditQueueOptions {
  fetchImpl?: typeof fetch;
  maxItems?: number;
}

interface FlushConsentAuditQueueResult {
  processed: number;
  remaining: number;
}

let flushInFlight: Promise<FlushConsentAuditQueueResult> | null = null;

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readQueueFromStorage(): ConsentAuditQueueItem[] {
  if (!isBrowserEnvironment()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CONSENT_AUDIT_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ConsentAuditQueueItem => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<ConsentAuditQueueItem>;
      return (
        (candidate.kind === "consent" || candidate.kind === "identity_link") &&
        typeof candidate.eventId === "string" &&
        typeof candidate.replayToken === "string" &&
        typeof candidate.attemptCount === "number" &&
        typeof candidate.queuedAt === "string" &&
        typeof candidate.nextAttemptAt === "number"
      );
    });
  } catch {
    return [];
  }
}

function writeQueueToStorage(queue: ConsentAuditQueueItem[]): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    window.localStorage.setItem(CONSENT_AUDIT_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn("[consent] Failed to write consent audit queue:", error);
  }
}

function pruneQueue(queue: ConsentAuditQueueItem[], nowMs: number): ConsentAuditQueueItem[] {
  const kept = queue.filter((item) => {
    const queuedAtMs = Date.parse(item.queuedAt);
    if (Number.isNaN(queuedAtMs)) {
      return false;
    }
    return nowMs - queuedAtMs <= MAX_QUEUE_AGE_MS;
  });

  if (kept.length <= MAX_QUEUE_ITEMS) {
    return kept;
  }

  return kept.slice(kept.length - MAX_QUEUE_ITEMS);
}

function scheduleRetry(item: ConsentAuditQueueItem): ConsentAuditQueueItem {
  const nextAttemptCount = item.attemptCount + 1;
  const exponentialDelay = BASE_RETRY_DELAY_MS * Math.pow(2, Math.max(nextAttemptCount - 1, 0));
  const boundedDelay = Math.min(MAX_RETRY_DELAY_MS, exponentialDelay);
  const jitter = Math.floor(Math.random() * 250);
  return {
    ...item,
    attemptCount: nextAttemptCount,
    nextAttemptAt: Date.now() + boundedDelay + jitter,
  };
}

function shouldDropForStatus(status: number): boolean {
  return NON_RETRYABLE_STATUS_CODES.has(status);
}

function shouldRetryForStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

export function enqueueConsentAuditReplay(input: {
  kind: ConsentAuditQueueItemKind;
  eventId: string;
  replayToken: string;
}): void {
  if (!isBrowserEnvironment()) {
    return;
  }

  const nowMs = Date.now();
  const existing = readQueueFromStorage().filter((item) => item.eventId !== input.eventId);
  existing.push({
    kind: input.kind,
    eventId: input.eventId,
    replayToken: input.replayToken,
    attemptCount: 0,
    queuedAt: new Date(nowMs).toISOString(),
    nextAttemptAt: nowMs,
  });

  writeQueueToStorage(pruneQueue(existing, nowMs));
}

async function doFlushConsentAuditReplayQueue({
  fetchImpl = fetch,
  maxItems = 20,
}: FlushConsentAuditQueueOptions = {}): Promise<FlushConsentAuditQueueResult> {
  if (!isBrowserEnvironment()) {
    return { processed: 0, remaining: 0 };
  }

  const nowMs = Date.now();
  const inputQueue = pruneQueue(readQueueFromStorage(), nowMs);
  const outputQueue: ConsentAuditQueueItem[] = [];
  let processed = 0;

  for (const item of inputQueue) {
    if (processed >= maxItems || item.nextAttemptAt > Date.now()) {
      outputQueue.push(item);
      continue;
    }

    processed += 1;

    try {
      const response = await fetchImpl("/api/consent/audit", {
        method: "POST",
        cache: "no-store",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replayToken: item.replayToken,
        }),
      });

      if (response.ok) {
        continue;
      }

      if (shouldDropForStatus(response.status)) {
        continue;
      }

      if (shouldRetryForStatus(response.status)) {
        outputQueue.push(scheduleRetry(item));
        continue;
      }

      outputQueue.push(scheduleRetry(item));
    } catch {
      outputQueue.push(scheduleRetry(item));
    }
  }

  const nextQueue = pruneQueue(outputQueue, Date.now());
  writeQueueToStorage(nextQueue);

  return {
    processed,
    remaining: nextQueue.length,
  };
}

export async function flushConsentAuditReplayQueue(
  options?: FlushConsentAuditQueueOptions
): Promise<FlushConsentAuditQueueResult> {
  if (flushInFlight) {
    return flushInFlight;
  }

  flushInFlight = doFlushConsentAuditReplayQueue(options).finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}
