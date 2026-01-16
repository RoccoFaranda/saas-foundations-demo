/*
  Warnings:

  - You are about to drop the column `description` on the `items` table. All the data in the column will be lost.
  - The `status` column on the `items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('light', 'dark', 'system');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('active', 'pending', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "ItemTag" AS ENUM ('feature', 'bugfix', 'docs', 'infra', 'design');

-- DropIndex
DROP INDEX "billing_customers_stripeCustomerId_idx";

-- DropIndex
DROP INDEX "billing_customers_userId_idx";

-- DropIndex
DROP INDEX "email_change_tokens_hashedToken_idx";

-- DropIndex
DROP INDEX "email_verification_tokens_hashedToken_idx";

-- DropIndex
DROP INDEX "password_reset_tokens_hashedToken_idx";

-- DropIndex
DROP INDEX "stripe_events_stripeEventId_idx";

-- DropIndex
DROP INDEX "users_email_idx";

-- AlterTable
ALTER TABLE "email_change_tokens" ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "email_verification_tokens" ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "items" DROP COLUMN "description",
ADD COLUMN     "metricValue" INTEGER,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "tag" "ItemTag",
DROP COLUMN "status",
ADD COLUMN     "status" "ItemStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "password_reset_tokens" ADD COLUMN     "usedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emailVerified",
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "themePreference" "ThemePreference";

-- CreateIndex
CREATE INDEX "items_status_idx" ON "items"("status");
