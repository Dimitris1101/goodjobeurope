-- AlterTable
ALTER TABLE "public"."Candidate" ADD COLUMN     "countryOfOrigin" TEXT,
ADD COLUMN     "driverLicenseA" BOOLEAN,
ADD COLUMN     "driverLicenseM" BOOLEAN,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "referenceLetterUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."CandidateLanguage" (
    "id" SERIAL NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "CandidateLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CandidateLanguage_candidateId_idx" ON "public"."CandidateLanguage"("candidateId");

-- AddForeignKey
ALTER TABLE "public"."CandidateLanguage" ADD CONSTRAINT "CandidateLanguage_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
