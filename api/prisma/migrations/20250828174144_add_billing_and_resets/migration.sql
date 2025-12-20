-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "public"."Plan" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "public"."Subscription"("planId");
