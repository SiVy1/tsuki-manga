"use server";

import { revalidatePath } from "next/cache";

import { CommentReportStatus, CommentStatus } from "@/generated/prisma/client";

import { requireAdmin } from "@/app/_lib/auth/session";
import { prisma } from "@/app/_lib/db/client";
import { fail, ok } from "@/app/_lib/utils/action-result";
import {
  moderateCommentInputSchema,
  moderateReportInputSchema,
} from "@/app/_lib/validation/comments";

function revalidateModerationSurfaces(chapterId?: string, chapterSlug?: string) {
  revalidatePath("/dashboard/comments");

  if (chapterId && chapterSlug) {
    revalidatePath(`/chapter/${chapterId}/${chapterSlug}`);
  }
}

async function resolveOpenReportsForComment(commentId: string, resolverId: string, note: string) {
  await prisma.commentReport.updateMany({
    where: {
      commentId,
      status: CommentReportStatus.OPEN,
    },
    data: {
      status: CommentReportStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedById: resolverId,
      resolutionNote: note,
    },
  });
}

export async function hideCommentAction(rawInput: unknown) {
  const user = await requireAdmin();
  const parsed = moderateCommentInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid moderation input.");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: parsed.data.commentId,
    },
    include: {
      chapter: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!comment) {
    return fail("Comment was not found.");
  }

  await prisma.comment.update({
    where: {
      id: comment.id,
    },
    data: {
      status: CommentStatus.HIDDEN,
    },
  });

  await resolveOpenReportsForComment(comment.id, user.id, "Comment hidden by moderation.");
  revalidateModerationSurfaces(comment.chapter.id, comment.chapter.slug);

  return ok({
    commentId: comment.id,
    status: CommentStatus.HIDDEN,
  });
}

export async function deleteCommentModerationAction(rawInput: unknown) {
  const user = await requireAdmin();
  const parsed = moderateCommentInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid moderation input.");
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: parsed.data.commentId,
    },
    include: {
      chapter: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!comment) {
    return fail("Comment was not found.");
  }

  await prisma.comment.update({
    where: {
      id: comment.id,
    },
    data: {
      status: CommentStatus.DELETED,
      deletedAt: comment.deletedAt ?? new Date(),
      deletedById: user.id,
      deleteReason: "Removed by moderation.",
    },
  });

  await resolveOpenReportsForComment(comment.id, user.id, "Comment removed by moderation.");
  revalidateModerationSurfaces(comment.chapter.id, comment.chapter.slug);

  return ok({
    commentId: comment.id,
    status: CommentStatus.DELETED,
  });
}

export async function resolveCommentReportAction(rawInput: unknown) {
  const user = await requireAdmin();
  const parsed = moderateReportInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid moderation input.");
  }

  const report = await prisma.commentReport.findUnique({
    where: {
      id: parsed.data.reportId,
    },
    include: {
      comment: {
        include: {
          chapter: {
            select: {
              id: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!report) {
    return fail("Report was not found.");
  }

  await prisma.commentReport.update({
    where: {
      id: report.id,
    },
    data: {
      status: CommentReportStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedById: user.id,
      resolutionNote: "Report resolved.",
    },
  });

  revalidateModerationSurfaces(report.comment.chapter.id, report.comment.chapter.slug);

  return ok({
    reportId: report.id,
    status: CommentReportStatus.RESOLVED,
  });
}

export async function rejectCommentReportAction(rawInput: unknown) {
  const user = await requireAdmin();
  const parsed = moderateReportInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid moderation input.");
  }

  const report = await prisma.commentReport.findUnique({
    where: {
      id: parsed.data.reportId,
    },
    include: {
      comment: {
        include: {
          chapter: {
            select: {
              id: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!report) {
    return fail("Report was not found.");
  }

  await prisma.commentReport.update({
    where: {
      id: report.id,
    },
    data: {
      status: CommentReportStatus.REJECTED,
      resolvedAt: new Date(),
      resolvedById: user.id,
      resolutionNote: "Report rejected.",
    },
  });

  revalidateModerationSurfaces(report.comment.chapter.id, report.comment.chapter.slug);

  return ok({
    reportId: report.id,
    status: CommentReportStatus.REJECTED,
  });
}
