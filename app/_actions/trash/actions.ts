"use server";

import { prisma } from "@/app/_lib/db/client";
import { requireAdmin } from "@/app/_lib/auth/session";
import { ok } from "@/app/_lib/utils/action-result";

export async function listDeletedSeriesAction() {
  await requireAdmin();

  const series = await prisma.series.findMany({
    where: {
      deletedAt: {
        not: null,
      },
    },
    orderBy: {
      deletedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      deletedAt: true,
    },
  });

  return ok(
    series.map((item) => ({
      ...item,
      deletedAt: item.deletedAt?.toISOString() ?? null,
    })),
  );
}

export async function listDeletedChaptersAction() {
  await requireAdmin();

  const chapters = await prisma.chapter.findMany({
    where: {
      deletedAt: {
        not: null,
      },
    },
    orderBy: {
      deletedAt: "desc",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      number: true,
      deletedAt: true,
      series: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return ok(
    chapters.map((item) => ({
      ...item,
      number: item.number.toString(),
      deletedAt: item.deletedAt?.toISOString() ?? null,
    })),
  );
}
