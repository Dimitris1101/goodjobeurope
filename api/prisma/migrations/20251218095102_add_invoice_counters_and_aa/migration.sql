-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "aa" INTEGER;

-- CreateTable
CREATE TABLE "InvoiceCounter" (
    "id" SERIAL NOT NULL,
    "series" "InvoiceSeries" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastAa" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCounter_series_year_key" ON "InvoiceCounter"("series", "year");
