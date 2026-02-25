-- AlterTable
ALTER TABLE "video" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
