-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "CommentReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'HATE', 'SEXUAL_CONTENT', 'VIOLENCE', 'MISINFORMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CommentReportStatus" AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Comment" (
    "id" UUID NOT NULL,
    "chapterId" UUID NOT NULL,
    "authorId" UUID,
    "parentId" UUID,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'VISIBLE',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" UUID,
    "deleteReason" TEXT,
    "authorIpHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReport" (
    "id" UUID NOT NULL,
    "commentId" UUID NOT NULL,
    "authorId" UUID,
    "reason" "CommentReportReason" NOT NULL,
    "details" TEXT,
    "status" "CommentReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comment_chapterId_createdAt_idx" ON "Comment"("chapterId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_createdAt_idx" ON "Comment"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_status_createdAt_idx" ON "Comment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommentReport_commentId_createdAt_idx" ON "CommentReport"("commentId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentReport_authorId_createdAt_idx" ON "CommentReport"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentReport_status_createdAt_idx" ON "CommentReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CommentReport_reason_createdAt_idx" ON "CommentReport"("reason", "createdAt");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
