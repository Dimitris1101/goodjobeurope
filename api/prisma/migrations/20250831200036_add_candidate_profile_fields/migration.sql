/*
  Warnings:

  - Added the required column `phone` to the `Company` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Candidate" ADD COLUMN     "about" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "degree" BOOLEAN,
ADD COLUMN     "degreeTitle" TEXT,
ADD COLUMN     "education" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "skillsText" TEXT,
ADD COLUMN     "volunteering" TEXT;

-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "phone" TEXT NOT NULL;
