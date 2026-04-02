import { beforeEach, describe, expect, it, vi } from "vitest";

import { createChapterAction, uploadChapterPagesAction } from "@/app/_actions/chapters/actions";
import { createSeriesAction } from "@/app/_actions/series/actions";
import { getDashboardOverviewData } from "@/app/_lib/dashboard/queries";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";
import { createPngFile } from "@/tests/integration/helpers/images";

const { requirePermissionMock } = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
}));

vi.mock("@/app/_lib/auth/session", () => ({
  requirePermission: requirePermissionMock,
  requireAdmin: vi.fn(),
  requireSessionUser: vi.fn(),
  requireDashboardUser: vi.fn(),
}));

describe("dashboard overview data", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
    requirePermissionMock.mockReset();
    requirePermissionMock.mockResolvedValue(testUsers.editor);
  });

  it("returns empty-state signals for a fresh instance", async () => {
    const data = await getDashboardOverviewData();

    expect(data.metrics.seriesCount).toBe(0);
    expect(data.latestDraft).toBeNull();
    expect(data.attention.draftsWithoutPagesCount).toBe(0);
    expect(data.attention.draftsReadyCount).toBe(0);
    expect(data.recentSeries).toEqual([]);
  });

  it("returns operational signals for ongoing editorial work", async () => {
    const firstSeries = await createSeriesAction({
      title: "North Pier",
    });

    if (!firstSeries.success) {
      throw new Error("first series creation failed");
    }

    const secondSeries = await createSeriesAction({
      title: "Silent Roof",
    });

    if (!secondSeries.success) {
      throw new Error("second series creation failed");
    }

    const emptyDraft = await createChapterAction({
      seriesId: firstSeries.data.id,
      number: "1",
      title: "Arrival",
    });

    if (!emptyDraft.success) {
      throw new Error("empty draft creation failed");
    }

    const readyDraft = await createChapterAction({
      seriesId: secondSeries.data.id,
      number: "2",
      title: "Signals",
    });

    if (!readyDraft.success) {
      throw new Error("ready draft creation failed");
    }

    const formData = new FormData();
    formData.append("files", await createPngFile("001.png"));

    const uploadResult = await uploadChapterPagesAction(readyDraft.data.id, formData);

    if (!uploadResult.success) {
      throw new Error("upload failed");
    }

    const data = await getDashboardOverviewData();

    expect(data.metrics.seriesCount).toBe(2);
    expect(data.metrics.draftCount).toBe(2);
    expect(data.attention.draftsWithoutPagesCount).toBe(1);
    expect(data.attention.draftsReadyCount).toBe(1);
    expect(data.latestDraft?.id).toBe(readyDraft.data.id);
    expect(data.latestDraft?.pageCount).toBe(1);
    expect(data.recentSeries[0]?.id).toBe(secondSeries.data.id);
    expect(data.recentChapters.some((chapter) => chapter.id === readyDraft.data.id)).toBe(true);
  });
});
