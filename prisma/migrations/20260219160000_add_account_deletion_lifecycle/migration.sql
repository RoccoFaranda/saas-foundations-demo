-- Alter users table with account deletion lifecycle timestamps.
ALTER TABLE "users"
ADD COLUMN "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN "deletionScheduledFor" TIMESTAMP(3);

-- Index for purge job scans.
CREATE INDEX "users_deletionScheduledFor_idx" ON "users"("deletionScheduledFor");

-- Token table for secure account restore links during grace window.
CREATE TABLE "account_deletion_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "account_deletion_tokens_hashedToken_key" ON "account_deletion_tokens"("hashedToken");
CREATE INDEX "account_deletion_tokens_userId_idx" ON "account_deletion_tokens"("userId");

ALTER TABLE "account_deletion_tokens"
ADD CONSTRAINT "account_deletion_tokens_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
