-- CreateEnum
CREATE TYPE "public"."JobSector" AS ENUM ('IT', 'SALES', 'ADMIN', 'LOGISTICS', 'FINANCE', 'MARKETING', 'FOOD', 'TOURISM', 'GENERAL_WORKERS', 'OTHER');

-- AlterTable
ALTER TABLE "public"."Job" ADD COLUMN     "preferredLangLevel" TEXT,
ADD COLUMN     "preferredLanguage" TEXT,
ADD COLUMN     "sector" "public"."JobSector",
ADD COLUMN     "sectorOtherText" TEXT;
