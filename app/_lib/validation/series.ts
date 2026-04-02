import { SeriesVisibility } from "@/generated/prisma/client";
import { z } from "zod";

import { nullableTrimmedString, uuidSchema } from "@/app/_lib/validation/shared";

export const createSeriesInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  slug: z.string().trim().optional(),
  descriptionShort: nullableTrimmedString,
  descriptionLong: nullableTrimmedString,
  visibility: z.nativeEnum(SeriesVisibility).default(SeriesVisibility.PUBLIC),
  taxonomyTermIds: z.array(uuidSchema).default([]),
  coverAssetId: uuidSchema.nullable().optional(),
});

export const updateSeriesInputSchema = createSeriesInputSchema.extend({
  id: uuidSchema,
});

export const softDeleteSeriesInputSchema = z.object({
  id: uuidSchema,
});

export const restoreSeriesInputSchema = z.object({
  id: uuidSchema,
});
