-- AlterTable
ALTER TABLE "public"."Candidate" ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false;
