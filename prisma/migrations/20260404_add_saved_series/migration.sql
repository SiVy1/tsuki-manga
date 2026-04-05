-- CreateTable
CREATE TABLE "SavedSeries" (
    "userId" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSeries_pkey" PRIMARY KEY ("userId","seriesId")
);

-- CreateIndex
CREATE INDEX "SavedSeries_seriesId_idx" ON "SavedSeries"("seriesId");

-- AddForeignKey
ALTER TABLE "SavedSeries" ADD CONSTRAINT "SavedSeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSeries" ADD CONSTRAINT "SavedSeries_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
