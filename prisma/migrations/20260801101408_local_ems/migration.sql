-- AlterTable
ALTER TABLE "Mission" ADD COLUMN     "localEmsDispatchPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "localEmsName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "localEmsPocName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "localEmsPocPhone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "localEmsStagingAddress" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "localEmsStagingLat" DOUBLE PRECISION,
ADD COLUMN     "localEmsStagingLng" DOUBLE PRECISION;

