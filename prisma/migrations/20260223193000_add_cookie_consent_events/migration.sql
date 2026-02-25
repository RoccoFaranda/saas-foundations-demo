CREATE TABLE "cookie_consent_events" (
  "id" TEXT NOT NULL,
  "consentId" TEXT NOT NULL,
  "userId" TEXT,
  "version" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "gpcHonored" BOOLEAN NOT NULL DEFAULT false,
  "functional" BOOLEAN NOT NULL DEFAULT false,
  "analytics" BOOLEAN NOT NULL DEFAULT false,
  "marketing" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cookie_consent_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cookie_consent_events_consentId_createdAt_idx"
  ON "cookie_consent_events"("consentId", "createdAt");

CREATE INDEX "cookie_consent_events_userId_createdAt_idx"
  ON "cookie_consent_events"("userId", "createdAt");

ALTER TABLE "cookie_consent_events"
  ADD CONSTRAINT "cookie_consent_events_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

