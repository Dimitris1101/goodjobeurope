/*
  Warnings:

  - You are about to drop the column `mydataMark` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `Invoice` table. All the data in the column will be lost.
  - Added the required column `type` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vatCategory` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vatPercent` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "mydataMark",
DROP COLUMN "pdfUrl",
ADD COLUMN     "mydataType" TEXT,
ADD COLUMN     "providerMark" TEXT,
ADD COLUMN     "providerPdfUrl" TEXT,
ADD COLUMN     "series" TEXT,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "vatCategory" INTEGER NOT NULL,
ADD COLUMN     "vatExemptionCode" TEXT,
ADD COLUMN     "vatPercent" INTEGER NOT NULL;
