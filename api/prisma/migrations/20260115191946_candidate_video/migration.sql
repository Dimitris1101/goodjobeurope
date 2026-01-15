-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "videoDurationSec" INTEGER,
ADD COLUMN     "videoKey" TEXT,
ADD COLUMN     "videoStatus" TEXT,
ADD COLUMN     "videoUpdatedAt" TIMESTAMP(3);
