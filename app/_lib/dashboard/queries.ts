import { notFound } from "next/navigation";

import { ChapterStatus, RolePreset } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { storageDriver } from "@/app/_lib/storage";
import { getInstanceSettings } from "@/app/_lib/settings/instance";

function mapAssetUrl(storageKey: string | null | undefined, isDraft = false, assetId?: string) {
  if (!storageKey) {
    return null;
  }

  if (isDraft && assetId) {
    return `/api/draft-assets/${assetId}`;
  }

  return storageDriver.getPublicUrl(storageKey);
}

export async function getDashboardOverviewData() {
  const [seriesCount, chapterCount, publishedCount, draftCount, recentChapters] =
    await Promise.all([
      prisma.series.count({
        where: {
          deletedAt: null,
        },
      }),
      prisma.chapter.count({
        where: {
          deletedAt: null,
        },
      }),
      prisma.chapter.count({
        where: {
          deletedAt: null,
          status: ChapterStatus.PUBLISHED,
        },
      }),
      prisma.chapter.count({
        where: {
          deletedAt: null,
          status: ChapterStatus.DRAFT,
        },
      }),
      prisma.chapter.findMany({
        where: {
          deletedAt: null,
        },
        include: {
          series: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 6,
      }),
    ]);

  return {
    metrics: {
      seriesCount,
      chapterCount,
      publishedCount,
      draftCount,
    },
    recentChapters: recentChapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      slug: chapter.slug,
      number: chapter.number.toString(),
      label: chapter.label,
      status: chapter.status,
      updatedAt: chapter.updatedAt.toISOString(),
      series: chapter.series,
    })),
  };
}

export async function getDashboardSeriesListData() {
  const [series, taxonomyTerms] = await Promise.all([
    prisma.series.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        coverAsset: true,
        chapters: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
        taxonomyTerms: {
          orderBy: {
            name: "asc",
          },
          take: 4,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.taxonomyTerm.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    series: series.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      visibility: item.visibility,
      coverUrl: mapAssetUrl(item.coverAsset?.storageKey),
      chapterCount: item.chapters.length,
      taxonomyTerms: item.taxonomyTerms.map((term) => term.name),
      updatedAt: item.updatedAt.toISOString(),
    })),
    taxonomyTerms,
  };
}

export async function getDashboardSeriesDetailData(id: string) {
  const [series, taxonomyTerms] = await Promise.all([
    prisma.series.findUnique({
      where: { id },
      include: {
        coverAsset: true,
        chapters: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ number: "asc" }, { createdAt: "asc" }],
        },
        taxonomyTerms: {
          orderBy: {
            name: "asc",
          },
        },
      },
    }),
    prisma.taxonomyTerm.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!series || series.deletedAt) {
    notFound();
  }

  return {
    series: {
      ...series,
      coverUrl: mapAssetUrl(series.coverAsset?.storageKey),
      chapters: series.chapters.map((chapter) => ({
        ...chapter,
        number: chapter.number.toString(),
      })),
    },
    taxonomyTerms,
  };
}

export async function getDashboardChapterListData() {
  const chapters = await prisma.chapter.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      series: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
      pages: {
        select: {
          id: true,
        },
      },
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  return chapters.map((chapter) => ({
    id: chapter.id,
    slug: chapter.slug,
    number: chapter.number.toString(),
    label: chapter.label,
    title: chapter.title,
    status: chapter.status,
    updatedAt: chapter.updatedAt.toISOString(),
    pageCount: chapter.pages.length,
    series: chapter.series,
  }));
}

export async function getDashboardChapterDetailData(id: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: {
      series: {
        select: {
          id: true,
          title: true,
          slug: true,
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
  });

  if (!chapter || chapter.deletedAt) {
    notFound();
  }

  return {
    chapter: {
      ...chapter,
      number: chapter.number.toString(),
      pages: chapter.pages.map((page) => ({
        ...page,
        previewUrl: mapAssetUrl(
          page.asset.storageKey,
          page.asset.scope === "DRAFT",
          page.asset.id,
        ),
      })),
    },
  };
}

export async function getDashboardSettingsData() {
  const [instanceSettings, taxonomyTerms] = await Promise.all([
    getInstanceSettings(),
    prisma.taxonomyTerm.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    instanceSettings,
    taxonomyTerms,
  };
}

export async function getDashboardUsersData() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "asc",
    },
    include: {
      accounts: {
        select: {
          provider: true,
          providerAccountId: true,
        },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    image: user.image,
    rolePreset: user.rolePreset,
    permissionBits: user.permissionBits,
    createdAt: user.createdAt.toISOString(),
    accounts: user.accounts,
  }));
}

export async function getDeletedSeriesData() {
  const deletedSeries = await prisma.series.findMany({
    where: {
      deletedAt: {
        not: null,
      },
    },
    orderBy: {
      deletedAt: "desc",
    },
  });

  return deletedSeries.map((series) => ({
    id: series.id,
    title: series.title,
    slug: series.slug,
    deletedAt: series.deletedAt?.toISOString() ?? null,
  }));
}

export async function getDeletedChaptersData() {
  const deletedChapters = await prisma.chapter.findMany({
    where: {
      deletedAt: {
        not: null,
      },
    },
    include: {
      series: {
        select: {
          title: true,
          deletedAt: true,
        },
      },
    },
    orderBy: {
      deletedAt: "desc",
    },
  });

  return deletedChapters.map((chapter) => ({
    id: chapter.id,
    slug: chapter.slug,
    number: chapter.number.toString(),
    label: chapter.label,
    title: chapter.title,
    deletedAt: chapter.deletedAt?.toISOString() ?? null,
    series: chapter.series,
  }));
}

export const rolePresetOptions = [
  RolePreset.READER,
  RolePreset.EDITOR,
  RolePreset.PUBLISHER,
  RolePreset.ADMIN,
];
