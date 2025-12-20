-- CreateEnum
CREATE TYPE "public"."SwipeDecision" AS ENUM ('LIKE', 'PASS');

-- CreateTable
CREATE TABLE "public"."JobSwipe" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "candidateId" INTEGER NOT NULL,
    "decision" "public"."SwipeDecision" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSwipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobSwipe_candidateId_jobId_idx" ON "public"."JobSwipe"("candidateId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobSwipe_jobId_candidateId_key" ON "public"."JobSwipe"("jobId", "candidateId");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "public"."Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "public"."Job"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."JobSwipe" ADD CONSTRAINT "JobSwipe_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobSwipe" ADD CONSTRAINT "JobSwipe_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "public"."Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
