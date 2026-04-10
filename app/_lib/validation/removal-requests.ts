import { z } from "zod";

import {
  RemovalRequestClaimantRole,
  SeriesRemovalRequestStatus,
} from "@/generated/prisma/client";

import { nullableTrimmedString, uuidSchema } from "@/app/_lib/validation/shared";

const claimantNameSchema = z
  .string()
  .trim()
  .min(2, "Claimant name is required.")
  .max(160, "Claimant name is too long.");

const claimantEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid contact email.")
  .max(320, "Contact email is too long.")
  .transform((value) => value.toLowerCase());

const textBlock = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} is too short.`)
    .max(max, `${label} is too long.`);

export const createSeriesRemovalRequestInputSchema = z.object({
  seriesUrl: z.string().trim().min(1, "Series URL is required.").max(500, "Series URL is too long."),
  claimantName: claimantNameSchema,
  organizationName: nullableTrimmedString.pipe(
    z.string().max(160, "Organization name is too long.").nullable(),
  ),
  claimantEmail: claimantEmailSchema,
  claimantRole: z.nativeEnum(RemovalRequestClaimantRole),
  claimSummary: textBlock("Claim summary", 20, 3_000),
  electronicSignature: claimantNameSchema,
  goodFaithConfirmed: z
    .boolean()
    .refine((value) => value, "You must confirm the good-faith statement."),
  accuracyConfirmed: z
    .boolean()
    .refine((value) => value, "You must confirm the accuracy statement."),
  renderedAt: z
    .number()
    .int()
    .positive("Invalid form timestamp."),
  website: z.string().max(0).default(""),
});

export const updateSeriesRemovalRequestStatusInputSchema = z.object({
  requestId: uuidSchema,
  status: z.nativeEnum(SeriesRemovalRequestStatus),
  adminNote: nullableTrimmedString.pipe(
    z.string().max(2_000, "Admin note is too long.").nullable(),
  ),
  resolutionNote: nullableTrimmedString.pipe(
    z.string().max(500, "Resolution note is too long.").nullable(),
  ),
});
