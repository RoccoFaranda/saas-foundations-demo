// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { enqueueConsentAuditReplay, flushConsentAuditReplayQueue } from "./audit-queue";

const AUDIT_QUEUE_STORAGE_KEY_V2 = "sf-consent-audit-queue:v2";
const AUDIT_QUEUE_STORAGE_KEY_V1 = "sf-consent-audit-queue:v1";

describe("consent audit replay queue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("drops queued item when replay endpoint returns 429", async () => {
    enqueueConsentAuditReplay({
      kind: "consent",
      eventId: "event-429",
      replayToken: "replay-token-429",
    });

    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 429 }));

    const result = await flushConsentAuditReplayQueue({ fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/consent/audit",
      expect.objectContaining({
        body: JSON.stringify({ replayToken: "replay-token-429" }),
      })
    );
    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY_V2)).toBe("[]");
  });

  it("keeps queued item and schedules retry for transient server failures", async () => {
    enqueueConsentAuditReplay({
      kind: "consent",
      eventId: "event-503",
      replayToken: "replay-token-503",
    });

    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    const result = await flushConsentAuditReplayQueue({ fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(1);
    expect(result.remaining).toBe(1);

    const queueRaw = window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY_V2);
    expect(queueRaw).not.toBeNull();
    const queue = JSON.parse(String(queueRaw)) as Array<{
      attemptCount: number;
      replayToken: string;
    }>;
    expect(queue).toHaveLength(1);
    expect(queue[0]?.attemptCount).toBe(1);
    expect(queue[0]?.replayToken).toBe("replay-token-503");
  });

  it("ignores legacy v1 queue payloads", async () => {
    window.localStorage.setItem(
      AUDIT_QUEUE_STORAGE_KEY_V1,
      JSON.stringify([
        {
          kind: "consent",
          payload: {
            eventId: "legacy-event",
            occurredAt: "2026-02-25T12:00:00.000Z",
            consentId: "consent-1",
            version: "2026.02.23",
            source: "preferences_save",
            gpcHonored: false,
            categories: {
              necessary: true,
              functional: true,
              analytics: false,
              marketing: false,
            },
          },
          attemptCount: 0,
          queuedAt: "2026-02-25T12:00:00.000Z",
          nextAttemptAt: Date.now(),
        },
      ])
    );

    const fetchImpl = vi.fn();
    const result = await flushConsentAuditReplayQueue({ fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
    expect(result.remaining).toBe(0);
    expect(window.localStorage.getItem(AUDIT_QUEUE_STORAGE_KEY_V2)).toBe("[]");
  });
});
