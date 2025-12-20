/*
  Warnings:

  - You are about to drop the column `mydataType` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `providerMark` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `providerPdfUrl` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Invoice` table. All the data in the column will be lost.
  - The `series` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InvoiceSeries" AS ENUM ('TPY', 'APY', 'TPY_EE', 'TPY_TX');

-- CreateEnum
CREATE TYPE "VatProfile" AS ENUM ('VAT24', 'VAT0_EE', 'VAT0_TX');

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "mydataType",
DROP COLUMN "providerMark",
DROP COLUMN "providerPdfUrl",
DROP COLUMN "type",
ADD COLUMN     "customerCity" TEXT,
ADD COLUMN     "customerCountry" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPostalCode" TEXT,
ADD COLUMN     "customerVat" TEXT,
ADD COLUMN     "incomeClassCategory" TEXT DEFAULT 'category1_3',
ADD COLUMN     "incomeClassType" TEXT DEFAULT 'E3_561_001',
ADD COLUMN     "mydataMark" TEXT,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "vatProfile" "VatProfile" NOT NULL DEFAULT 'VAT24',
DROP COLUMN "series",
ADD COLUMN     "series" "InvoiceSeries" NOT NULL DEFAULT 'TPY',
ALTER COLUMN "vatCategory" DROP NOT NULL,
ALTER COLUMN "vatPercent" SET DEFAULT 24;
