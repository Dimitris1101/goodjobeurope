/*
  Warnings:

  - A unique constraint covering the columns `[candidateId,jobId]` on the table `JobSwipe` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."JobSwipe_candidateId_jobId_idx";

-- DropIndex
DROP INDEX "public"."JobSwipe_jobId_candidateId_key";

-- CreateIndex
CREATE UNIQUE INDEX "JobSwipe_candidateId_jobId_key" ON "public"."JobSwipe"("candidateId", "jobId");
