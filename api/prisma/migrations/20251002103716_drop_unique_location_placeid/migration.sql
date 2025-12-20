-- DropIndex
DROP INDEX "public"."Candidate_locationPlaceId_key";

-- CreateIndex
CREATE INDEX "Candidate_locationPlaceId_idx" ON "public"."Candidate"("locationPlaceId");
