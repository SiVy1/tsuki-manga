"use server";

import { SeriesVisibility } from "@/generated/prisma/client";

import { requireSessionUser } from "@/app/_lib/auth/session";
import { prisma } from "@/app/_lib/db/client";
import { fail, ok } from "@/app/_lib/utils/action-result";
import { toggleSavedSeriesInputSchema } from "@/app/_lib/validation/library";

async function ensureSavableSeries(seriesId: string) {
  const series = await prisma.series.findFirst({
    where: {
      id: seriesId,
      deletedAt: null,
      visibility: SeriesVisibility.PUBLIC,
    },
    select: {
      id: true,
    },
  });

  if (!series) {
    return null;
  }

  return series.id;
}

export async function saveSeriesAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = toggleSavedSeriesInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid saved series input.");
  }

  const seriesId = await ensureSavableSeries(parsed.data.seriesId);

  if (!seriesId) {
    return fail("Series is not available to save.");
  }

  await prisma.savedSeries.upsert({
    where: {
      userId_seriesId: {
        userId: user.id,
        seriesId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      seriesId,
    },
  });

  return ok({
    seriesId,
    saved: true,
  });
}

export async function removeSavedSeriesAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = toggleSavedSeriesInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid saved series input.");
  }

  await prisma.savedSeries.deleteMany({
    where: {
      userId: user.id,
      seriesId: parsed.data.seriesId,
    },
  });

  return ok({
    seriesId: parsed.data.seriesId,
    saved: false,
  });
}
