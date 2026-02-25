// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueConsentAuditReplay, flushConsentAuditReplayQueue } from "./audit-queue";

const AUDIT_QUEUE_STORAGE_KEY = "sf-consent-audit-queue:v1";

function createPayload(eventId: string) {
  return {
    eventId,
    occurredAt: "2026-02-25T12:00:00.000Z",
    consentId: "consent-1",
    version: "2026.02.23",
    source: "preferences_save" as const,
    gpcHonored: false,
    categories: {
      necessary: true as const,
      functional: true,
      analytics: false,
      marketing: false,
    },
  };
}

describe("consent audit replay queue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("drops queued item when replay endpoint returns 429", async () => {
    enqueueConsentAuditReplay({
      kind: "consent",
      payload: createPayload("event-429"),
    });

    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));

    const result = await flushConsentAuditReplayQueue({ fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY)).toBe("[]");
  });

  it("keeps queued item and schedules retry for transient server failures", async () => {
    enqueueConsentAuditReplay({
      kind: "consent",
      payload: createPayload("event-503"),
    });

    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    const result = await flushConsentAuditReplayQueue({ fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(1);

    const queueRaw = window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY);
    expect(queueRaw).not.toBeNull();
    const queue = JSON.parse(String(queueRaw)) as Array<{ attemptCount: number }>;
    expect(queue).toHaveLength(1);
    expect(queue[0]?.attemptCount).toBe(1);
  });
});
