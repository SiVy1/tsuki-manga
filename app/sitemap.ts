import type { MetadataRoute } from "next";

import { ChapterStatus, SeriesVisibility } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { isMissingDatabaseStructureError } from "@/app/_lib/db/errors";
import { getAppBaseUrl } from "@/app/_lib/settings/app-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getAppBaseUrl();

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
        url: `${baseUrl}/`,
      },
      {
        url: `${baseUrl}/series`,
      },
      ...series.map((entry) => ({
        url: `${baseUrl}/series/${entry.slug}`,
        lastModified: entry.updatedAt,
      })),
      ...chapters.map((entry) => ({
        url: `${baseUrl}/chapter/${entry.id}/${entry.slug}`,
        lastModified: entry.updatedAt,
      })),
    ];
  } catch (error) {
    if (isMissingDatabaseStructureError(error)) {
      return [
        {
          url: `${baseUrl}/`,
        },
        {
          url: `${baseUrl}/series`,
        },
      ];
    }

    throw error;
  }
}
