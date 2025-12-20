/*
  Warnings:

  - A unique constraint covering the columns `[companyId,candidateId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Conversation_companyId_candidateId_key" ON "public"."Conversation"("companyId", "candidateId");
