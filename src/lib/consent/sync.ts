import { consentSyncMessageSchema } from "./schema";

export type ConsentSyncMessage = {
  type: "consent_updated";
  senderId: string;
  nonce: string;
  at: string;
};

function createRandomToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createConsentSyncSenderId() {
  return `consent-tab-${createRandomToken()}`;
}

export function createConsentSyncMessage(senderId: string): ConsentSyncMessage {
  return {
    type: "consent_updated",
    senderId,
    nonce: createRandomToken(),
    at: new Date().toISOString(),
  };
}

export function parseConsentSyncMessage(input: unknown): ConsentSyncMessage | null {
  const parsed = consentSyncMessageSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
