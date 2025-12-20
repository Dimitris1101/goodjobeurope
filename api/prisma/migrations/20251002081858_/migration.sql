/*
  Warnings:

  - A unique constraint covering the columns `[locationPlaceId]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Candidate" ADD COLUMN     "locationAdmin" TEXT,
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationCountryCode" TEXT,
ADD COLUMN     "locationCountryName" TEXT,
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "locationPlaceId" TEXT,
ADD COLUMN     "locationText" TEXT;

-- AlterTable
ALTER TABLE "public"."Job" ADD COLUMN     "locationAdmin" TEXT,
ADD COLUMN     "locationCity" TEXT,
ADD COLUMN     "locationCountryCode" TEXT,
ADD COLUMN     "locationCountryName" TEXT,
ADD COLUMN     "locationLat" DOUBLE PRECISION,
ADD COLUMN     "locationLng" DOUBLE PRECISION,
ADD COLUMN     "locationPlaceId" TEXT,
ADD COLUMN     "locationText" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_locationPlaceId_key" ON "public"."Candidate"("locationPlaceId");

-- CreateIndex
CREATE INDEX "Candidate_locationLat_locationLng_idx" ON "public"."Candidate"("locationLat", "locationLng");

-- CreateIndex
CREATE INDEX "Job_locationLat_locationLng_idx" ON "public"."Job"("locationLat", "locationLng");

-- CreateIndex
CREATE INDEX "Job_locationCountryCode_locationCity_idx" ON "public"."Job"("locationCountryCode", "locationCity");
