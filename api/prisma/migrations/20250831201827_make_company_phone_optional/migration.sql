/*
  Warnings:

  - You are about to drop the column `contactEmail` on the `Company` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Company" DROP COLUMN "contactEmail",
ALTER COLUMN "phone" DROP NOT NULL;
