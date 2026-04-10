-- CreateEnum
CREATE TYPE "RemovalRequestClaimantRole" AS ENUM ('COPYRIGHT_OWNER', 'AUTHORIZED_AGENT');

-- CreateEnum
CREATE TYPE "SeriesRemovalRequestStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_ACCEPTED', 'RESOLVED_REJECTED');

-- CreateTable
CREATE TABLE "SeriesRemovalRequest" (
    "id" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "claimantName" TEXT NOT NULL,
    "organizationName" TEXT,
    "claimantEmail" TEXT NOT NULL,
    "claimantRole" "RemovalRequestClaimantRole" NOT NULL,
    "workDescription" TEXT NOT NULL,
    "infringementExplanation" TEXT NOT NULL,
    "requestedAction" TEXT NOT NULL,
    "additionalDetails" TEXT,
    "electronicSignature" TEXT NOT NULL,
    "goodFaithConfirmed" BOOLEAN NOT NULL,
    "accuracyConfirmed" BOOLEAN NOT NULL,
    "status" "SeriesRemovalRequestStatus" NOT NULL DEFAULT 'OPEN',
    "reporterIpHash" TEXT,
    "userAgent" TEXT,
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeriesRemovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeriesRemovalRequest_seriesId_createdAt_idx" ON "SeriesRemovalRequest"("seriesId", "createdAt");

-- CreateIndex
CREATE INDEX "SeriesRemovalRequest_claimantEmail_createdAt_idx" ON "SeriesRemovalRequest"("claimantEmail", "createdAt");

-- CreateIndex
CREATE INDEX "SeriesRemovalRequest_status_createdAt_idx" ON "SeriesRemovalRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SeriesRemovalRequest_reporterIpHash_createdAt_idx" ON "SeriesRemovalRequest"("reporterIpHash", "createdAt");

-- AddForeignKey
ALTER TABLE "SeriesRemovalRequest" ADD CONSTRAINT "SeriesRemovalRequest_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeriesRemovalRequest" ADD CONSTRAINT "SeriesRemovalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
