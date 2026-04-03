import { beforeEach, describe, expect, it } from "vitest";

import { AssetKind, AssetScope, ChapterStatus, SeriesVisibility } from "@/generated/prisma/client";

import sitemap from "@/app/sitemap";
import { GET as getFeed } from "@/app/feed.xml/route";
import { buildRootMetadata } from "@/app/_lib/seo/metadata";
import { prisma } from "@/app/_lib/db/client";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";

describe("seo metadata and sitemap", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
  });

  it("uses instance settings as the root metadata fallback", async () => {
    await prisma.instanceSettings.create({
      data: {
        groupName: "Tsuki Scans",
        siteTitle: "Tsuki Library",
        siteDescription: "Quiet releases and reader-first pages.",
        keywords: ["manga", "reader"],
      },
    });

    const metadata = await buildRootMetadata();

    expect(metadata.title).toMatchObject({
      default: "Tsuki Library",
      template: "%s | Tsuki Library",
    });
    expect(metadata.description).toBe("Quiet releases and reader-first pages.");
    expect(metadata.keywords).toEqual(["manga", "reader"]);
  });

  it("includes only public routes in the sitemap", async () => {
    const series = await prisma.series.create({
      data: {
        title: "Moon Harbor",
        slug: "moon-harbor",
        visibility: SeriesVisibility.PUBLIC,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    const hiddenSeries = await prisma.series.create({
      data: {
        title: "Hidden Harbor",
        slug: "hidden-harbor",
        visibility: SeriesVisibility.HIDDEN,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    const publicAsset = await prisma.asset.create({
      data: {
        storageDriver: "LOCAL",
        kind: AssetKind.CHAPTER_PAGE,
        scope: AssetScope.PUBLIC,
        storageKey: "chapter-page/seo-demo.png",
        originalFilename: "seo-demo.png",
        mimeType: "image/png",
        sizeBytes: BigInt(256),
        width: 100,
        height: 200,
        createdById: testUsers.editor.id,
      },
    });

    const publishedChapter = await prisma.chapter.create({
      data: {
        id: "10000000-0000-4000-8000-000000000021",
        seriesId: series.id,
        slug: "chapter-1",
        number: "1",
        status: ChapterStatus.PUBLISHED,
        publishedAt: new Date("2026-04-01T12:00:00.000Z"),
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    await prisma.chapterPage.create({
      data: {
        chapterId: publishedChapter.id,
        assetId: publicAsset.id,
        pageOrder: 1,
        width: 100,
        height: 200,
      },
    });

    await prisma.chapter.create({
      data: {
        id: "10000000-0000-4000-8000-000000000022",
        seriesId: hiddenSeries.id,
        slug: "hidden-chapter",
        number: "1",
        status: ChapterStatus.PUBLISHED,
        publishedAt: new Date("2026-04-01T12:30:00.000Z"),
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("http://localhost:3000");
    expect(urls).toContain("http://localhost:3000/series");
    expect(urls).toContain("http://localhost:3000/series/moon-harbor");
    expect(urls).toContain(
      `http://localhost:3000/chapter/${publishedChapter.id}/${publishedChapter.slug}`,
    );
    expect(urls).not.toContain("http://localhost:3000/dashboard");
    expect(urls).not.toContain("http://localhost:3000/series/hidden-harbor");
  });

  it("returns an rss feed with only published chapters from public series", async () => {
    await prisma.instanceSettings.create({
      data: {
        groupName: "Tsuki Scans",
        siteTitle: "Tsuki Library",
        siteDescription: "Quiet releases and reader-first pages.",
      },
    });

    const series = await prisma.series.create({
      data: {
        title: "Moon Harbor",
        slug: "moon-harbor",
        visibility: SeriesVisibility.PUBLIC,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    const hiddenSeries = await prisma.series.create({
      data: {
        title: "Hidden Harbor",
        slug: "hidden-harbor",
        visibility: SeriesVisibility.HIDDEN,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    await prisma.chapter.create({
      data: {
        id: "10000000-0000-4000-8000-000000000031",
        seriesId: series.id,
        slug: "chapter-2",
        number: "2",
        title: "Lantern Tide",
        status: ChapterStatus.PUBLISHED,
        publishedAt: new Date("2026-04-01T14:00:00.000Z"),
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    await prisma.chapter.create({
      data: {
        id: "10000000-0000-4000-8000-000000000032",
        seriesId: series.id,
        slug: "chapter-3-draft",
        number: "3",
        status: ChapterStatus.DRAFT,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    await prisma.chapter.create({
      data: {
        id: "10000000-0000-4000-8000-000000000033",
        seriesId: hiddenSeries.id,
        slug: "hidden-release",
        number: "1",
        status: ChapterStatus.PUBLISHED,
        publishedAt: new Date("2026-04-01T15:00:00.000Z"),
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    const response = await getFeed();
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/rss+xml");
    expect(xml).toContain("<title>Tsuki Library</title>");
    expect(xml).toContain(
      "<link>http://localhost:3000/chapter/10000000-0000-4000-8000-000000000031/chapter-2</link>",
    );
    expect(xml).toContain("Moon Harbor - Chapter 2: Lantern Tide");
    expect(xml).not.toContain("chapter-3-draft");
    expect(xml).not.toContain("hidden-release");
  });
});
