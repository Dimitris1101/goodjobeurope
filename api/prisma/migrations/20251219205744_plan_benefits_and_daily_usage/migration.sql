-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "adIntervalSec" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "adMaxPerDay" INTEGER,
ADD COLUMN     "canUploadProfilePhoto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "candidateLikesPerDay" INTEGER,
ADD COLUMN     "companyAdsMax" INTEGER,
ADD COLUMN     "companyMatchupsPerDay" INTEGER;

-- CreateTable
CREATE TABLE "DailyUsage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "companyMatchups" INTEGER NOT NULL DEFAULT 0,
    "candidateLikes" INTEGER NOT NULL DEFAULT 0,
    "adsShown" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyUsage_userId_day_idx" ON "DailyUsage"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUsage_userId_day_key" ON "DailyUsage"("userId", "day");
