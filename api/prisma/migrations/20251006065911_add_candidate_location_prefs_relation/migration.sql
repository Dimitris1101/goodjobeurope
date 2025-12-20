-- CreateTable
CREATE TABLE "public"."CandidateLocationPreference" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "placeId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "city" TEXT,
    "admin" TEXT,
    "countryCode" TEXT,
    "countryName" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateLocationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateLocationPreference_candidateId_idx" ON "public"."CandidateLocationPreference"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateLocationPreference_countryCode_city_idx" ON "public"."CandidateLocationPreference"("countryCode", "city");

-- CreateIndex
CREATE INDEX "CandidateLocationPreference_lat_lng_idx" ON "public"."CandidateLocationPreference"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateLocationPreference_candidateId_placeId_key" ON "public"."CandidateLocationPreference"("candidateId", "placeId");

-- AddForeignKey
ALTER TABLE "public"."CandidateLocationPreference" ADD CONSTRAINT "CandidateLocationPreference_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
