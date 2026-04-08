import { z } from "zod";

import {
  CommentReportReason,
  CommentStatus,
} from "@/generated/prisma/client";

import { nullableTrimmedString, uuidSchema } from "@/app/_lib/validation/shared";

const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty.")
  .max(2_000, "Comment is too long.");

const chapterPayloadSchema = z.object({
  chapterId: uuidSchema,
  chapterSlug: z.string().trim().min(1),
});

export const createCommentInputSchema = chapterPayloadSchema.extend({
  body: commentBodySchema,
});

export const replyToCommentInputSchema = chapterPayloadSchema.extend({
  parentId: uuidSchema,
  body: commentBodySchema,
});

export const editCommentInputSchema = chapterPayloadSchema.extend({
  commentId: uuidSchema,
  body: commentBodySchema,
});

export const deleteCommentInputSchema = chapterPayloadSchema.extend({
  commentId: uuidSchema,
});

export const reportCommentInputSchema = chapterPayloadSchema.extend({
  commentId: uuidSchema,
  reason: z.nativeEnum(CommentReportReason),
  details: nullableTrimmedString.pipe(
    z.string().max(500, "Report details are too long.").nullable(),
  ),
});

export const moderateCommentInputSchema = z.object({
  commentId: uuidSchema,
});

export const moderateReportInputSchema = z.object({
  reportId: uuidSchema,
});

export const publicCommentStatuses = [
  CommentStatus.VISIBLE,
  CommentStatus.DELETED,
  CommentStatus.HIDDEN,
] as const;
