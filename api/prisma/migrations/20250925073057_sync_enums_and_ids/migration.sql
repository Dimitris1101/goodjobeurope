/*
  Warnings:

  - The values [ACTIVE,PAUSED,CLOSED] on the enum `JobStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currency` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `remote` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `salaryMax` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `salaryMin` on the `Job` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."CompanyPlan" AS ENUM ('SIMPLE', 'SILVER', 'GOLDEN');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."JobStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
ALTER TABLE "public"."Job" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Job" ALTER COLUMN "status" TYPE "public"."JobStatus_new" USING ("status"::text::"public"."JobStatus_new");
ALTER TYPE "public"."JobStatus" RENAME TO "JobStatus_old";
ALTER TYPE "public"."JobStatus_new" RENAME TO "JobStatus";
DROP TYPE "public"."JobStatus_old";
ALTER TABLE "public"."Job" ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
COMMIT;

-- DropIndex
DROP INDEX "public"."Job_companyId_idx";

-- DropIndex
DROP INDEX "public"."Job_remote_idx";

-- DropIndex
DROP INDEX "public"."Job_status_createdAt_idx";

-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "jobLimitOverride" INTEGER,
ADD COLUMN     "plan" "public"."CompanyPlan" NOT NULL DEFAULT 'SIMPLE';

-- AlterTable
ALTER TABLE "public"."Job" DROP COLUMN "currency",
DROP COLUMN "remote",
DROP COLUMN "salaryMax",
DROP COLUMN "salaryMin",
ALTER COLUMN "status" SET DEFAULT 'PUBLISHED';
