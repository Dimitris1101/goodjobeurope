-- CreateEnum
CREATE TYPE "public"."JobWorkMode" AS ENUM ('ONSITE', 'REMOTE', 'HYBRID');

-- AlterTable
ALTER TABLE "public"."Job" ADD COLUMN     "requireLicenseA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireLicenseM" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "workMode" "public"."JobWorkMode" NOT NULL DEFAULT 'ONSITE';
