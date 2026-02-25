import { z } from "zod";
import { CONSENT_EVENT_SOURCE_IDENTITY_LINK } from "./config";
import { CONSENT_SOURCES } from "./types";

export const consentCategoriesSchema = z.object({
  necessary: z.literal(true),
  functional: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
});

export const consentOptionalCategoriesSchema = z.object({
  functional: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
});

export const consentSourceSchema = z.enum(CONSENT_SOURCES);
export const consentAuditSourceSchema = z.union([
  consentSourceSchema,
  z.literal(CONSENT_EVENT_SOURCE_IDENTITY_LINK),
]);

export const consentAuditMetadataSchema = z.object({
  eventId: z.string().min(1),
  occurredAt: z.iso.datetime(),
});

export const consentStateSchema = z.object({
  consentId: z.string().min(1),
  version: z.string().min(1),
  updatedAt: z.iso.datetime(),
  source: consentSourceSchema,
  gpcHonored: z.boolean(),
  categories: consentCategoriesSchema,
});

export const consentWritePayloadSchema = z.object({
  source: consentSourceSchema,
  categories: consentOptionalCategoriesSchema,
  eventId: z.string().min(1).optional(),
  occurredAt: z.iso.datetime().optional(),
});

export const consentLinkPayloadSchema = z.object({
  eventId: z.string().min(1).optional(),
  occurredAt: z.iso.datetime().optional(),
});

export const consentAuditReplayPayloadSchema = z.object({
  replayToken: z.string().min(1),
});

export const consentSyncMessageSchema = z.object({
  type: z.literal("consent_updated"),
  senderId: z.string().min(1),
  nonce: z.string().min(1),
  at: z.iso.datetime(),
});
