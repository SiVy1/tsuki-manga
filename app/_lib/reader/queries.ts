import { notFound } from "next/navigation";

import { ChapterStatus, SeriesVisibility } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { isMissingDatabaseStructureError } from "@/app/_lib/db/errors";
import { storageDriver } from "@/app/_lib/storage";
import { getInstanceSettings } from "@/app/_lib/settings/instance";

function mapPublicAssetUrl(storageKey: string | null | undefined) {
  if (!storageKey) {
    return null;
  }

  return storageDriver.getPublicUrl(storageKey);
}

function mapChapterNumber(value: { toString(): string }) {
  return value.toString();
}

async function withMissingStructureFallback<T>(
  load: () => Promise<T>,
  fallback: T,
) {
  try {
    return await load();
  } catch (error) {
    if (isMissingDatabaseStructureError(error)) {
      return fallback;
    }

    throw error;
  }
}

export async function getHomePageData() {
  const instanceSettings = await getInstanceSettings();
  const latestChapters = await withMissingStructureFallback(
    () =>
      prisma.chapter.findMany({
        where: {
          status: ChapterStatus.PUBLISHED,
          deletedAt: null,
          series: {
            deletedAt: null,
            visibility: SeriesVisibility.PUBLIC,
          },
        },
        include: {
          series: {
            include: {
              coverAsset: true,
            },
          },
        },
        orderBy: {
          publishedAt: "desc",
        },
        take: 12,
      }),
    [],
  );

  return {
    instanceSettings,
    latestChapters: latestChapters.map((chapter) => ({
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      number: mapChapterNumber(chapter.number),
      label: chapter.label,
      publishedAt: chapter.publishedAt,
      series: {
        id: chapter.series.id,
        title: chapter.series.title,
        slug: chapter.series.slug,
        coverUrl: mapPublicAssetUrl(chapter.series.coverAsset?.storageKey),
      },
    })),
  };
}

export async function getSeriesCatalogData() {
  const instanceSettings = await getInstanceSettings();
  const seriesList = await withMissingStructureFallback(
    () =>
      prisma.series.findMany({
        where: {
          deletedAt: null,
          visibility: SeriesVisibility.PUBLIC,
        },
        include: {
          coverAsset: true,
          taxonomyTerms: {
            orderBy: {
              name: "asc",
            },
          },
          chapters: {
            where: {
              deletedAt: null,
              status: ChapterStatus.PUBLISHED,
            },
            orderBy: [{ number: "desc" }, { createdAt: "desc" }],
            take: 1,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      }),
    [],
  );

  return {
    instanceSettings,
    series: seriesList.map((series) => ({
      id: series.id,
      title: series.title,
      slug: series.slug,
      descriptionShort: series.descriptionShort,
      coverUrl: mapPublicAssetUrl(series.coverAsset?.storageKey),
      taxonomyTerms: series.taxonomyTerms.map((term) => term.name),
      latestChapter: series.chapters[0]
        ? {
            id: series.chapters[0].id,
            slug: series.chapters[0].slug,
            number: mapChapterNumber(series.chapters[0].number),
            label: series.chapters[0].label,
          }
        : null,
    })),
  };
}

export async function resolveSeriesBySlug(slug: string) {
  const directMatch = await withMissingStructureFallback(
    () =>
      prisma.series.findFirst({
        where: {
          slug,
          deletedAt: null,
          visibility: SeriesVisibility.PUBLIC,
        },
        include: {
          coverAsset: true,
          taxonomyTerms: {
            orderBy: {
              name: "asc",
            },
          },
          chapters: {
            where: {
              deletedAt: null,
              status: ChapterStatus.PUBLISHED,
            },
            orderBy: [{ number: "desc" }, { createdAt: "desc" }],
          },
        },
      }),
    null,
  );

  if (directMatch) {
    return {
      kind: "resolved" as const,
      series: {
        id: directMatch.id,
        title: directMatch.title,
        slug: directMatch.slug,
        descriptionShort: directMatch.descriptionShort,
        descriptionLong: directMatch.descriptionLong,
        coverUrl: mapPublicAssetUrl(directMatch.coverAsset?.storageKey),
        taxonomyTerms: directMatch.taxonomyTerms.map((term) => ({
          id: term.id,
          name: term.name,
          slug: term.slug,
          type: term.type,
        })),
        chapters: directMatch.chapters.map((chapter) => ({
          id: chapter.id,
          slug: chapter.slug,
          title: chapter.title,
          number: mapChapterNumber(chapter.number),
          label: chapter.label,
          publishedAt: chapter.publishedAt,
        })),
      },
    };
  }

  const historicalSlug = await withMissingStructureFallback(
    () =>
      prisma.seriesSlugHistory.findUnique({
        where: { slug },
        include: {
          series: {
            select: {
              slug: true,
              deletedAt: true,
              visibility: true,
            },
          },
        },
      }),
    null,
  );

  if (
    historicalSlug &&
    !historicalSlug.series.deletedAt &&
    historicalSlug.series.visibility === SeriesVisibility.PUBLIC
  ) {
    return {
      kind: "redirect" as const,
      slug: historicalSlug.series.slug,
    };
  }

  return null;
}

export async function getPublicSeriesOrThrow(slug: string) {
  const result = await resolveSeriesBySlug(slug);

  if (!result) {
    notFound();
  }

  return result;
}

export async function resolveChapterReaderData(chapterId: string, slug: string) {
  const chapter = await withMissingStructureFallback(
    () =>
      prisma.chapter.findFirst({
        where: {
          id: chapterId,
          deletedAt: null,
          status: ChapterStatus.PUBLISHED,
          series: {
            deletedAt: null,
            visibility: SeriesVisibility.PUBLIC,
          },
        },
        include: {
          series: {
            include: {
              coverAsset: true,
            },
          },
          pages: {
            include: {
              asset: true,
            },
            orderBy: {
              pageOrder: "asc",
            },
          },
        },
      }),
    null,
  );

  if (!chapter) {
    return null;
  }

  if (chapter.slug !== slug) {
    const isHistoricalSlug = await withMissingStructureFallback(
      () =>
        prisma.chapterSlugHistory.findFirst({
          where: {
            chapterId: chapter.id,
            slug,
          },
          select: {
            id: true,
          },
        }),
      null,
    );

    if (isHistoricalSlug) {
      return {
        kind: "redirect" as const,
        chapterId: chapter.id,
        slug: chapter.slug,
      };
    }
  }

  const siblings = await withMissingStructureFallback(
    () =>
      prisma.chapter.findMany({
        where: {
          seriesId: chapter.seriesId,
          deletedAt: null,
          status: ChapterStatus.PUBLISHED,
        },
        orderBy: [{ number: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          number: true,
          label: true,
        },
      }),
    [],
  );

  const currentIndex = siblings.findIndex((entry) => entry.id === chapter.id);
  const previousChapter = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < siblings.length - 1
      ? siblings[currentIndex + 1]
      : null;

  return {
    kind: "resolved" as const,
    chapter: {
      id: chapter.id,
      slug: chapter.slug,
      title: chapter.title,
      number: mapChapterNumber(chapter.number),
      label: chapter.label,
      publishedAt: chapter.publishedAt,
      pages: chapter.pages.map((page) => ({
        id: page.id,
        pageOrder: page.pageOrder,
        width: page.width,
        height: page.height,
        imageUrl: mapPublicAssetUrl(page.asset.storageKey),
      })),
      series: {
        id: chapter.series.id,
        title: chapter.series.title,
        slug: chapter.series.slug,
        coverUrl: mapPublicAssetUrl(chapter.series.coverAsset?.storageKey),
      },
      navigation: {
        previous: previousChapter
          ? {
              id: previousChapter.id,
              slug: previousChapter.slug,
              title: previousChapter.title,
              number: mapChapterNumber(previousChapter.number),
              label: previousChapter.label,
            }
          : null,
        next: nextChapter
          ? {
              id: nextChapter.id,
              slug: nextChapter.slug,
              title: nextChapter.title,
              number: mapChapterNumber(nextChapter.number),
              label: nextChapter.label,
            }
          : null,
      },
    },
  };
}

export async function getPublicChapterOrThrow(chapterId: string, slug: string) {
  const result = await resolveChapterReaderData(chapterId, slug);

  if (!result) {
    notFound();
  }

  return result;
}
