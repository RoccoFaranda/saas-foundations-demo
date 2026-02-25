import { z } from "zod";
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
});

export const consentSyncMessageSchema = z.object({
  type: z.literal("consent_updated"),
  senderId: z.string().min(1),
  nonce: z.string().min(1),
  at: z.iso.datetime(),
});
