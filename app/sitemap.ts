import type { MetadataRoute } from "next";

import { ChapterStatus, SeriesVisibility } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { isMissingOrUnavailableDatabaseError } from "@/app/_lib/db/errors";
import { buildAbsoluteUrl } from "@/app/_lib/seo/public-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homeUrl = await buildAbsoluteUrl();
  const seriesIndexUrl = await buildAbsoluteUrl("series");

  try {
    const [series, chapters] = await Promise.all([
      prisma.series.findMany({
        where: {
          deletedAt: null,
          visibility: SeriesVisibility.PUBLIC,
        },
        select: {
          slug: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
      prisma.chapter.findMany({
        where: {
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
          updatedAt: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    ]);

    return [
      {
        url: homeUrl,
      },
      {
        url: seriesIndexUrl,
      },
      ...series.map((entry) => ({
        url: `${homeUrl}/series/${entry.slug}`,
        lastModified: entry.updatedAt,
      })),
      ...chapters.map((entry) => ({
        url: `${homeUrl}/chapter/${entry.id}/${entry.slug}`,
        lastModified: entry.updatedAt,
      })),
    ];
  } catch (error) {
    if (isMissingOrUnavailableDatabaseError(error)) {
      return [
        {
          url: homeUrl,
        },
        {
          url: seriesIndexUrl,
        },
      ];
    }

    throw error;
  }
}
