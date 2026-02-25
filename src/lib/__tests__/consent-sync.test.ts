import { describe, expect, it } from "vitest";
import {
  createConsentSyncMessage,
  createConsentSyncSenderId,
  parseConsentSyncMessage,
} from "@/src/lib/consent/sync";

describe("consent sync helpers", () => {
  it("creates a valid sync sender id", () => {
    const senderId = createConsentSyncSenderId();
    expect(senderId).toMatch(/^consent-tab-/);
  });

  it("creates and parses a valid sync message", () => {
    const message = createConsentSyncMessage("tab-1");
    const parsed = parseConsentSyncMessage(message);

    expect(parsed).toEqual(message);
    expect(parsed?.type).toBe("consent_updated");
    expect(parsed?.senderId).toBe("tab-1");
  });

  it("returns null for invalid sync payloads", () => {
    expect(parseConsentSyncMessage({})).toBeNull();
    expect(
      parseConsentSyncMessage({ type: "consent_updated", senderId: "", nonce: "x", at: "nope" })
    ).toBeNull();
    expect(parseConsentSyncMessage("invalid")).toBeNull();
  });
});
