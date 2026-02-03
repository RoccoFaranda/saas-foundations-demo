-- AlterTable: Add lifecycle timestamp columns first
ALTER TABLE "items" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "items" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "items_userId_archivedAt_idx" ON "items"("userId", "archivedAt");

-- AlterEnum: Remove 'archived' from ItemStatus
-- Update any existing rows that have archived status
UPDATE "items" SET "status" = 'completed' WHERE "status" = 'archived';

-- Drop default, change enum, restore default
ALTER TABLE "items" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "ItemStatus" RENAME TO "ItemStatus_old";
CREATE TYPE "ItemStatus" AS ENUM ('active', 'pending', 'completed');
ALTER TABLE "items" ALTER COLUMN "status" TYPE "ItemStatus" USING "status"::text::"ItemStatus";
ALTER TABLE "items" ALTER COLUMN "status" SET DEFAULT 'active';
DROP TYPE "ItemStatus_old";
