"use server";

import { revalidatePath } from "next/cache";

import {
  ChapterStatus,
  CommentReportStatus,
  CommentStatus,
  SeriesVisibility,
} from "@/generated/prisma/client";

import { requireSessionUser } from "@/app/_lib/auth/session";
import { prisma } from "@/app/_lib/db/client";
import { fail, ok } from "@/app/_lib/utils/action-result";
import {
  createCommentInputSchema,
  deleteCommentInputSchema,
  editCommentInputSchema,
  replyToCommentInputSchema,
  reportCommentInputSchema,
} from "@/app/_lib/validation/comments";

function revalidateCommentSurfaces(chapterId: string, chapterSlug: string) {
  revalidatePath(`/chapter/${chapterId}/${chapterSlug}`);
  revalidatePath("/dashboard/comments");
}

async function ensurePublicChapter(chapterId: string, chapterSlug: string) {
  return prisma.chapter.findFirst({
    where: {
      id: chapterId,
      slug: chapterSlug,
      deletedAt: null,
      status: ChapterStatus.PUBLISHED,
      series: {
        deletedAt: null,
        visibility: SeriesVisibility.PUBLIC,
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });
}

async function ensureCommentForChapter(commentId: string, chapterId: string) {
  return prisma.comment.findFirst({
    where: {
      id: commentId,
      chapterId,
    },
    select: {
      id: true,
      chapterId: true,
      parentId: true,
      authorId: true,
      status: true,
    },
  });
}

export async function createCommentAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = createCommentInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid comment input.");
  }

  const chapter = await ensurePublicChapter(parsed.data.chapterId, parsed.data.chapterSlug);

  if (!chapter) {
    return fail("Chapter is not available for discussion.");
  }

  const comment = await prisma.comment.create({
    data: {
      chapterId: chapter.id,
      authorId: user.id,
      body: parsed.data.body,
      status: CommentStatus.VISIBLE,
    },
    select: {
      id: true,
    },
  });

  revalidateCommentSurfaces(chapter.id, chapter.slug);

  return ok({
    commentId: comment.id,
  });
}

export async function replyToCommentAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = replyToCommentInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid reply input.");
  }

  const chapter = await ensurePublicChapter(parsed.data.chapterId, parsed.data.chapterSlug);

  if (!chapter) {
    return fail("Chapter is not available for discussion.");
  }

  const parent = await ensureCommentForChapter(parsed.data.parentId, chapter.id);

  if (!parent || parent.status !== CommentStatus.VISIBLE) {
    return fail("That comment is no longer available for replies.");
  }

  if (parent.parentId) {
    return fail("Replies can only be added to top-level comments.");
  }

  const reply = await prisma.comment.create({
    data: {
      chapterId: chapter.id,
      authorId: user.id,
      parentId: parent.id,
      body: parsed.data.body,
      status: CommentStatus.VISIBLE,
    },
    select: {
      id: true,
    },
  });

  revalidateCommentSurfaces(chapter.id, chapter.slug);

  return ok({
    commentId: reply.id,
  });
}

export async function editCommentAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = editCommentInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid comment edit input.");
  }

  const chapter = await ensurePublicChapter(parsed.data.chapterId, parsed.data.chapterSlug);

  if (!chapter) {
    return fail("Chapter is not available for discussion.");
  }

  const comment = await ensureCommentForChapter(parsed.data.commentId, chapter.id);

  if (!comment || comment.authorId !== user.id) {
    return fail("You cannot edit this comment.");
  }

  if (comment.status !== CommentStatus.VISIBLE) {
    return fail("This comment can no longer be edited.");
  }

  await prisma.comment.update({
    where: {
      id: comment.id,
    },
    data: {
      body: parsed.data.body,
      isEdited: true,
      editedAt: new Date(),
    },
  });

  revalidateCommentSurfaces(chapter.id, chapter.slug);

  return ok({
    commentId: comment.id,
  });
}

export async function deleteOwnCommentAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = deleteCommentInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid comment delete input.");
  }

  const chapter = await ensurePublicChapter(parsed.data.chapterId, parsed.data.chapterSlug);

  if (!chapter) {
    return fail("Chapter is not available for discussion.");
  }

  const comment = await ensureCommentForChapter(parsed.data.commentId, chapter.id);

  if (!comment || comment.authorId !== user.id) {
    return fail("You cannot delete this comment.");
  }

  if (comment.status === CommentStatus.DELETED) {
    return ok({
      commentId: parsed.data.commentId,
    });
  }

  await prisma.comment.update({
    where: {
      id: comment.id,
    },
    data: {
      status: CommentStatus.DELETED,
      deletedAt: new Date(),
      deletedById: user.id,
      deleteReason: "Removed by author.",
    },
  });

  revalidateCommentSurfaces(chapter.id, chapter.slug);

  return ok({
    commentId: comment.id,
  });
}

export async function reportCommentAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = reportCommentInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid report input.");
  }

  const chapter = await ensurePublicChapter(parsed.data.chapterId, parsed.data.chapterSlug);

  if (!chapter) {
    return fail("Chapter is not available for discussion.");
  }

  const comment = await ensureCommentForChapter(parsed.data.commentId, chapter.id);

  if (!comment || comment.status !== CommentStatus.VISIBLE) {
    return fail("This comment cannot be reported.");
  }

  if (comment.authorId === user.id) {
    return fail("You cannot report your own comment.");
  }

  const existingReport = await prisma.commentReport.findFirst({
    where: {
      commentId: comment.id,
      authorId: user.id,
      status: CommentReportStatus.OPEN,
    },
    select: {
      id: true,
    },
  });

  if (existingReport) {
    return fail("You already reported this comment.");
  }

  await prisma.commentReport.create({
    data: {
      commentId: comment.id,
      authorId: user.id,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
      status: CommentReportStatus.OPEN,
    },
  });

  revalidateCommentSurfaces(chapter.id, chapter.slug);

  return ok({
    commentId: comment.id,
    reported: true,
  });
}
