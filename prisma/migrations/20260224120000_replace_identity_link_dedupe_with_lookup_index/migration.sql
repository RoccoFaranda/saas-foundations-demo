DROP INDEX IF EXISTS "cookie_consent_events_identity_link_signature_uidx";

CREATE INDEX IF NOT EXISTS "cookie_consent_events_identity_link_latest_lookup_idx"
  ON "cookie_consent_events"("consentId", "userId", "createdAt" DESC)
  WHERE "source" = 'identity_link' AND "userId" IS NOT NULL;
