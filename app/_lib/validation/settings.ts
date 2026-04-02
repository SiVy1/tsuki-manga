import { TaxonomyType } from "@/generated/prisma/client";
import { z } from "zod";

import { nullableTrimmedString, uuidSchema } from "@/app/_lib/validation/shared";

export const updateInstanceSettingsInputSchema = z.object({
  groupName: z.string().trim().min(1).max(120),
  groupDescription: nullableTrimmedString,
  siteTitle: z.string().trim().min(1).max(120),
  siteDescription: z.string().trim().min(1).max(320),
  keywords: z.array(z.string().trim().min(1).max(50)).max(20),
});

export const upsertSocialLinkInputSchema = z.object({
  id: uuidSchema.optional(),
  label: z.string().trim().min(1).max(50),
  url: z.string().url(),
  iconType: nullableTrimmedString,
  iconSvg: nullableTrimmedString,
});

export const deleteSocialLinkInputSchema = z.object({
  id: uuidSchema,
});

export const upsertTaxonomyTermInputSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().optional(),
  type: z.nativeEnum(TaxonomyType),
});

export const deleteTaxonomyTermInputSchema = z.object({
  id: uuidSchema,
});
