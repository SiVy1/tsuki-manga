import { beforeEach, describe, expect, it } from "vitest";

import { AssetKind, AssetScope, ChapterStatus, SeriesVisibility } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import {
  getHomePageData,
  getSeriesCatalogData,
  resolveChapterReaderData,
  resolveSeriesBySlug,
} from "@/app/_lib/reader/queries";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";

describe("public backend read layer", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
  });

  it("returns only published public content on the homepage and in catalog", async () => {
    const coverAsset = await prisma.asset.create({
      data: {
        storageDriver: "LOCAL",
        kind: AssetKind.SERIES_COVER,
        scope: AssetScope.PUBLIC,
        storageKey: "series-cover/demo.png",
        originalFilename: "demo.png",
        mimeType: "image/png",
        sizeBytes: BigInt(128),
        createdById: testUsers.editor.id,
      },
    });

    const series = await prisma.series.create({
      data: {
        title: "Visible Series",
        slug: "visible-series",
        visibility: SeriesVisibility.PUBLIC,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
        coverAssetId: coverAsset.id,
      },
    });

    const hiddenSeries = await prisma.series.create({
      data: {
        title: "Hidden Series",
        slug: "hidden-series",
        visibility: SeriesVisibility.HIDDEN,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    await prisma.chapter.createMany({
      data: [
        {
          id: "10000000-0000-4000-8000-000000000001",
          seriesId: series.id,
          slug: "chapter-1",
          number: "1",
          status: ChapterStatus.PUBLISHED,
          publishedAt: new Date("2026-04-01T10:00:00.000Z"),
          createdById: testUsers.editor.id,
          updatedById: testUsers.editor.id,
        },
        {
          id: "10000000-0000-4000-8000-000000000002",
          seriesId: hiddenSeries.id,
          slug: "chapter-hidden",
          number: "1",
          status: ChapterStatus.PUBLISHED,
          publishedAt: new Date("2026-04-01T11:00:00.000Z"),
          createdById: testUsers.editor.id,
          updatedById: testUsers.editor.id,
        },
        {
          id: "10000000-0000-4000-8000-000000000003",
          seriesId: series.id,
          slug: "chapter-draft",
          number: "2",
          status: ChapterStatus.DRAFT,
          createdById: testUsers.editor.id,
          updatedById: testUsers.editor.id,
        },
      ],
    });

    const homeData = await getHomePageData();
    const catalogData = await getSeriesCatalogData();

    expect(homeData.latestChapters).toHaveLength(1);
    expect(homeData.latestChapters[0]?.series.slug).toBe("visible-series");
    expect(catalogData.series).toHaveLength(1);
    expect(catalogData.series[0]?.coverUrl).toBe("/media/series-cover/demo.png");
  });

  it("resolves slug history redirects for public series and chapters", async () => {
    const series = await prisma.series.create({
      data: {
        title: "Redirect Series",
        slug: "current-series",
        visibility: SeriesVisibility.PUBLIC,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    await prisma.seriesSlugHistory.create({
      data: {
        seriesId: series.id,
        slug: "old-series",
      },
    });

    const chapter = await prisma.chapter.create({
      data: {
        id: "10000000-0000-4000-8000-000000000011",
        seriesId: series.id,
        slug: "current-chapter",
        number: "1",
        status: ChapterStatus.PUBLISHED,
        publishedAt: new Date("2026-04-01T12:00:00.000Z"),
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    await prisma.chapterSlugHistory.create({
      data: {
        chapterId: chapter.id,
        slug: "old-chapter",
      },
    });

    const imageAsset = await prisma.asset.create({
      data: {
        storageDriver: "LOCAL",
        kind: AssetKind.CHAPTER_PAGE,
        scope: AssetScope.PUBLIC,
        storageKey: "chapter-page/demo.png",
        originalFilename: "demo.png",
        mimeType: "image/png",
        sizeBytes: BigInt(256),
        width: 100,
        height: 200,
        createdById: testUsers.editor.id,
      },
    });

    await prisma.chapterPage.create({
      data: {
        chapterId: chapter.id,
        assetId: imageAsset.id,
        pageOrder: 1,
        width: 100,
        height: 200,
      },
    });

    const seriesRedirect = await resolveSeriesBySlug("old-series");
    const chapterRedirect = await resolveChapterReaderData(chapter.id, "old-chapter");

    expect(seriesRedirect).toEqual({
      kind: "redirect",
      slug: "current-series",
    });
    expect(chapterRedirect).toEqual({
      kind: "redirect",
      chapterId: chapter.id,
      slug: "current-chapter",
    });
  });
});
