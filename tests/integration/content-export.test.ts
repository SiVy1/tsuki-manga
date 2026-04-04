import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AssetKind,
  AssetScope,
  ChapterStatus,
  RolePreset,
  SeriesVisibility,
} from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { GET as getContentExport } from "@/app/api/export/content/route";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/app/_lib/auth", () => ({
  auth: authMock,
}));

describe("content export route", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
    authMock.mockReset();
  });

  it("returns a content export for admin users", async () => {
    authMock.mockResolvedValue({
      user: {
        id: testUsers.admin.id,
        rolePreset: RolePreset.ADMIN,
      },
    });

    const logoAsset = await prisma.asset.create({
      data: {
        storageDriver: "LOCAL",
        kind: AssetKind.INSTANCE_LOGO,
        scope: AssetScope.PUBLIC,
        storageKey: "instance/logo.png",
        originalFilename: "logo.png",
        mimeType: "image/png",
        sizeBytes: BigInt(1024),
        width: 256,
        height: 256,
        createdById: testUsers.admin.id,
      },
    });

    const coverAsset = await prisma.asset.create({
      data: {
        storageDriver: "LOCAL",
        kind: AssetKind.SERIES_COVER,
        scope: AssetScope.PUBLIC,
        storageKey: "series/cover.png",
        originalFilename: "cover.png",
        mimeType: "image/png",
        sizeBytes: BigInt(2048),
        width: 600,
        height: 800,
        createdById: testUsers.editor.id,
      },
    });

    const pageAsset = await prisma.asset.create({
      data: {
        storageDriver: "LOCAL",
        kind: AssetKind.CHAPTER_PAGE,
        scope: AssetScope.DRAFT,
        storageKey: "chapters/page-1.png",
        originalFilename: "page-1.png",
        mimeType: "image/png",
        sizeBytes: BigInt(4096),
        width: 800,
        height: 1200,
        createdById: testUsers.editor.id,
      },
    });

    const taxonomy = await prisma.taxonomyTerm.create({
      data: {
        name: "Fantasy",
        slug: "fantasy",
        type: "GENRE",
      },
    });

    await prisma.instanceSettings.create({
      data: {
        groupName: "Tsuki Scans",
        groupDescription: "Quiet editorial releases.",
        siteTitle: "Tsuki Manga",
        siteDescription: "Reader-first scanlation platform.",
        keywords: ["manga", "scanlation"],
        logoAssetId: logoAsset.id,
        socialLinks: {
          create: {
            label: "Discord",
            url: "https://example.com/discord",
          },
        },
      },
    });

    const series = await prisma.series.create({
      data: {
        title: "Moon Harbor",
        slug: "moon-harbor",
        descriptionShort: "A quiet harbor story.",
        visibility: SeriesVisibility.PUBLIC,
        coverAssetId: coverAsset.id,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
        taxonomyTerms: {
          connect: [{ id: taxonomy.id }],
        },
      },
    });

    const chapter = await prisma.chapter.create({
      data: {
        seriesId: series.id,
        slug: "chapter-1",
        number: "1",
        title: "Lantern Tide",
        status: ChapterStatus.DRAFT,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    await prisma.chapterPage.create({
      data: {
        chapterId: chapter.id,
        assetId: pageAsset.id,
        pageOrder: 1,
        width: 800,
        height: 1200,
      },
    });

    const response = await getContentExport();
    const payload = JSON.parse(await response.text()) as {
      version: number;
      instance: {
        groupName: string;
        logoAssetId: string | null;
        socialLinks: Array<{ label: string }>;
        taxonomyTerms: Array<{ id: string }>;
      };
      series: Array<{
        id: string;
        coverAssetId: string | null;
        taxonomyTermIds: string[];
        chapters: Array<{
          id: string;
          number: string;
          pages: Array<{ assetId: string; pageOrder: number }>;
        }>;
      }>;
      assets: Array<{ id: string; storageKey: string; sizeBytes: string }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("content-disposition")).toContain("tsuki-manga-export-");
    expect(payload.version).toBe(1);
    expect(payload.instance.groupName).toBe("Tsuki Scans");
    expect(payload.instance.logoAssetId).toBe(logoAsset.id);
    expect(payload.instance.socialLinks).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Discord" })]),
    );
    expect(payload.instance.taxonomyTerms).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: taxonomy.id })]),
    );
    expect(payload.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: series.id,
          coverAssetId: coverAsset.id,
          taxonomyTermIds: [taxonomy.id],
          chapters: [
            expect.objectContaining({
              id: chapter.id,
              number: "1",
              pages: [expect.objectContaining({ assetId: pageAsset.id, pageOrder: 1 })],
            }),
          ],
        }),
      ]),
    );
    expect(payload.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: logoAsset.id,
          storageKey: "instance/logo.png",
          sizeBytes: "1024",
        }),
        expect.objectContaining({
          id: coverAsset.id,
          storageKey: "series/cover.png",
          sizeBytes: "2048",
        }),
        expect.objectContaining({
          id: pageAsset.id,
          storageKey: "chapters/page-1.png",
          sizeBytes: "4096",
        }),
      ]),
    );
    expect(payload).not.toHaveProperty("users");
    expect(payload).not.toHaveProperty("sessions");
  });

  it("blocks non-admin users", async () => {
    authMock.mockResolvedValue({
      user: {
        id: testUsers.editor.id,
        rolePreset: RolePreset.EDITOR,
      },
    });

    const response = await getContentExport();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: "Forbidden." });
  });
});
