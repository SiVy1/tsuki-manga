import { access } from "node:fs/promises";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createChapterAction,
  moveChapterPageAction,
  publishChapterAction,
  removeChapterPageAction,
  replaceChapterPageAction,
  restoreChapterAction,
  softDeleteChapterAction,
  unpublishChapterAction,
  uploadChapterPagesAction,
} from "@/app/_actions/chapters/actions";
import {
  createSeriesAction,
  restoreSeriesAction,
  softDeleteSeriesAction,
} from "@/app/_actions/series/actions";
import { prisma } from "@/app/_lib/db/client";
import { getDashboardChapterPreviewData } from "@/app/_lib/dashboard/queries";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";
import { createPngFile } from "@/tests/integration/helpers/images";

const { requirePermissionMock, requireAdminMock } = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  requireAdminMock: vi.fn(),
}));

vi.mock("@/app/_lib/auth/session", () => ({
  requirePermission: requirePermissionMock,
  requireAdmin: requireAdminMock,
  requireSessionUser: vi.fn(),
  requireDashboardUser: vi.fn(),
}));

describe("series and chapter backend flow", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
    requirePermissionMock.mockReset();
    requireAdminMock.mockReset();
    requirePermissionMock.mockResolvedValue(testUsers.editor);
    requireAdminMock.mockResolvedValue(testUsers.admin);
  });

  it("creates series and chapters, uploads pages, publishes and unpublishes", async () => {
    const seriesResult = await createSeriesAction({
      title: "Tsuki no Yoru",
    });

    expect(seriesResult.success).toBe(true);

    if (!seriesResult.success) {
      throw new Error("series creation failed");
    }

    const chapterResult = await createChapterAction({
      seriesId: seriesResult.data.id,
      number: "1",
      title: "Arrival",
    });

    expect(chapterResult.success).toBe(true);

    if (!chapterResult.success) {
      throw new Error("chapter creation failed");
    }

    const formData = new FormData();
    formData.append("files", await createPngFile("001.png"));
    formData.append("files", await createPngFile("002.png", { rgb: { r: 120, g: 90, b: 150 } }));

    const uploadResult = await uploadChapterPagesAction(chapterResult.data.id, formData);

    expect(uploadResult.success).toBe(true);

    if (!uploadResult.success) {
      throw new Error("upload failed");
    }

    const draftAssets = await prisma.asset.findMany({
      where: {
        id: {
          in: uploadResult.data.pages.map((page) => page.assetId),
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    expect(draftAssets).toHaveLength(2);
    expect(draftAssets.every((asset) => asset.scope === "DRAFT")).toBe(true);

    await access(path.join(process.cwd(), ".storage", "draft", draftAssets[0]!.storageKey));

    requirePermissionMock.mockResolvedValue(testUsers.publisher);

    const publishResult = await publishChapterAction({
      chapterId: chapterResult.data.id,
    });

    expect(publishResult.success).toBe(true);

    const publishedChapter = await prisma.chapter.findUnique({
      where: { id: chapterResult.data.id },
      include: {
        pages: {
          include: { asset: true },
        },
      },
    });

    expect(publishedChapter?.status).toBe("PUBLISHED");
    expect(publishedChapter?.pages.every((page) => page.asset.scope === "PUBLIC")).toBe(true);

    await access(
      path.join(process.cwd(), "public", "media", publishedChapter!.pages[0]!.asset.storageKey),
    );

    const unpublishResult = await unpublishChapterAction({
      chapterId: chapterResult.data.id,
    });

    expect(unpublishResult.success).toBe(true);

    const unpublishedChapter = await prisma.chapter.findUnique({
      where: { id: chapterResult.data.id },
      include: {
        pages: {
          include: { asset: true },
        },
      },
    });

    expect(unpublishedChapter?.status).toBe("DRAFT");
    expect(unpublishedChapter?.pages.every((page) => page.asset.scope === "DRAFT")).toBe(true);
  });

  it("supports draft preview plus move, remove, and replace page actions", async () => {
    const seriesResult = await createSeriesAction({
      title: "Workflow Pages",
    });

    if (!seriesResult.success) {
      throw new Error("series creation failed");
    }

    const chapterResult = await createChapterAction({
      seriesId: seriesResult.data.id,
      number: "3",
      title: "Preview Pass",
    });

    if (!chapterResult.success) {
      throw new Error("chapter creation failed");
    }

    const uploadFormData = new FormData();
    uploadFormData.append("files", await createPngFile("001.png", { rgb: { r: 40, g: 80, b: 120 } }));
    uploadFormData.append("files", await createPngFile("002.png", { rgb: { r: 120, g: 80, b: 40 } }));
    uploadFormData.append("files", await createPngFile("003.png", { rgb: { r: 80, g: 120, b: 40 } }));

    const uploadResult = await uploadChapterPagesAction(chapterResult.data.id, uploadFormData);

    if (!uploadResult.success) {
      throw new Error("upload failed");
    }

    const initialPages = await prisma.chapterPage.findMany({
      where: {
        chapterId: chapterResult.data.id,
      },
      include: {
        asset: true,
      },
      orderBy: {
        pageOrder: "asc",
      },
    });

    const moveResult = await moveChapterPageAction({
      chapterId: chapterResult.data.id,
      pageId: initialPages[2]!.id,
      direction: "up",
    });

    expect(moveResult.success).toBe(true);

    const movedPages = await prisma.chapterPage.findMany({
      where: {
        chapterId: chapterResult.data.id,
      },
      include: {
        asset: true,
      },
      orderBy: {
        pageOrder: "asc",
      },
    });

    expect(movedPages.map((page) => page.asset.originalFilename)).toEqual([
      "001.png",
      "003.png",
      "002.png",
    ]);

    const removeResult = await removeChapterPageAction({
      chapterId: chapterResult.data.id,
      pageId: movedPages[1]!.id,
    });

    expect(removeResult.success).toBe(true);

    const afterRemovePages = await prisma.chapterPage.findMany({
      where: {
        chapterId: chapterResult.data.id,
      },
      include: {
        asset: true,
      },
      orderBy: {
        pageOrder: "asc",
      },
    });

    expect(afterRemovePages).toHaveLength(2);
    expect(afterRemovePages.map((page) => page.pageOrder)).toEqual([1, 2]);
    expect(afterRemovePages.map((page) => page.asset.originalFilename)).toEqual([
      "001.png",
      "002.png",
    ]);

    const replaceFormData = new FormData();
    replaceFormData.append(
      "file",
      await createPngFile("replacement.png", {
        width: 64,
        height: 96,
        rgb: { r: 200, g: 90, b: 150 },
      }),
    );

    const oldStorageKey = afterRemovePages[0]!.asset.storageKey;
    const replaceResult = await replaceChapterPageAction(
      chapterResult.data.id,
      afterRemovePages[0]!.id,
      replaceFormData,
    );

    expect(replaceResult.success).toBe(true);

    const replacedPage = await prisma.chapterPage.findUnique({
      where: {
        id: afterRemovePages[0]!.id,
      },
      include: {
        asset: true,
      },
    });

    expect(replacedPage?.pageOrder).toBe(1);
    expect(replacedPage?.width).toBe(64);
    expect(replacedPage?.height).toBe(96);
    expect(replacedPage?.asset.originalFilename).toBe("replacement.png");
    expect(replacedPage?.asset.storageKey).not.toBe(oldStorageKey);

    const previewData = await getDashboardChapterPreviewData(chapterResult.data.id);

    expect(previewData.chapter.pages).toHaveLength(2);
    expect(previewData.chapter.pages[0]?.imageUrl).toContain("/api/draft-assets/");
  });

  it("soft deletes and restores content according to product rules", async () => {
    const seriesResult = await createSeriesAction({
      title: "Trash Flow",
    });

    if (!seriesResult.success) {
      throw new Error("series creation failed");
    }

    const chapterResult = await createChapterAction({
      seriesId: seriesResult.data.id,
      number: "7.5",
      label: "extra",
    });

    if (!chapterResult.success) {
      throw new Error("chapter creation failed");
    }

    const deleteSeriesResult = await softDeleteSeriesAction({
      id: seriesResult.data.id,
    });

    expect(deleteSeriesResult.success).toBe(true);

    const restoreChapterWithoutSeries = await restoreChapterAction({
      chapterId: chapterResult.data.id,
    });

    expect(restoreChapterWithoutSeries.success).toBe(false);
    expect("requiresSeriesRestore" in restoreChapterWithoutSeries).toBe(true);

    const restoreChapterWithSeries = await restoreChapterAction({
      chapterId: chapterResult.data.id,
      restoreSeries: true,
    });

    expect(restoreChapterWithSeries.success).toBe(true);

    const chapterAfterRestore = await prisma.chapter.findUnique({
      where: { id: chapterResult.data.id },
    });

    const seriesAfterRestore = await prisma.series.findUnique({
      where: { id: seriesResult.data.id },
    });

    expect(chapterAfterRestore?.status).toBe("DRAFT");
    expect(chapterAfterRestore?.deletedAt).toBeNull();
    expect(seriesAfterRestore?.visibility).toBe("HIDDEN");

    await softDeleteChapterAction({
      chapterId: chapterResult.data.id,
    });

    const restoreSeriesResult = await restoreSeriesAction({
      id: seriesResult.data.id,
    });

    expect(restoreSeriesResult.success).toBe(true);

    const restoredSeries = await prisma.series.findUnique({
      where: { id: seriesResult.data.id },
    });

    const restoredChapter = await prisma.chapter.findUnique({
      where: { id: chapterResult.data.id },
    });

    expect(restoredSeries?.deletedAt).toBeNull();
    expect(restoredSeries?.visibility).toBe("HIDDEN");
    expect(restoredChapter?.deletedAt).toBeNull();
    expect(restoredChapter?.status).toBe("DRAFT");
  });
});
