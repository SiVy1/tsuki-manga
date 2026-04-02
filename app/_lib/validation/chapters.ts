import { z } from "zod";

import { nullableTrimmedString, uuidSchema } from "@/app/_lib/validation/shared";

const chapterNumberSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Chapter number must be a decimal-compatible string.");

export const createChapterInputSchema = z.object({
  seriesId: uuidSchema,
  slug: z.string().trim().optional(),
  number: chapterNumberSchema,
  label: nullableTrimmedString,
  title: nullableTrimmedString,
});

export const updateChapterInputSchema = createChapterInputSchema.extend({
  id: uuidSchema,
});

export const reorderChapterPagesInputSchema = z.object({
  chapterId: uuidSchema,
  pages: z.array(
    z.object({
      id: uuidSchema,
      pageOrder: z.number().int().positive(),
    }),
  ),
});

export const moveChapterPageInputSchema = z.object({
  chapterId: uuidSchema,
  pageId: uuidSchema,
  direction: z.enum(["up", "down"]),
});

export const removeChapterPageInputSchema = z.object({
  chapterId: uuidSchema,
  pageId: uuidSchema,
});

export const replaceChapterPageInputSchema = z.object({
  chapterId: uuidSchema,
  pageId: uuidSchema,
});

export const publishChapterInputSchema = z.object({
  chapterId: uuidSchema,
});

export const unpublishChapterInputSchema = z.object({
  chapterId: uuidSchema,
});

export const softDeleteChapterInputSchema = z.object({
  chapterId: uuidSchema,
});

export const restoreChapterInputSchema = z.object({
  chapterId: uuidSchema,
  restoreSeries: z.boolean().optional().default(false),
});
