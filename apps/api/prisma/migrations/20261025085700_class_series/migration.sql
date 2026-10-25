-- AlterTable
ALTER TABLE "ClassSession" ADD COLUMN     "seriesId" UUID;

-- CreateIndex
CREATE INDEX "ClassSession_seriesId_startsAt_idx" ON "ClassSession"("seriesId", "startsAt");
