ALTER TABLE "users"
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersionAccepted" TEXT,
ADD COLUMN "privacyAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN "privacyVersionAcknowledged" TEXT;
