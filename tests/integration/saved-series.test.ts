import { beforeEach, describe, expect, it, vi } from "vitest";

import { SeriesVisibility } from "@/generated/prisma/client";

import {
  removeSavedSeriesAction,
  saveSeriesAction,
} from "@/app/_actions/library/actions";
import { prisma } from "@/app/_lib/db/client";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";

const { requireSessionUserMock } = vi.hoisted(() => ({
  requireSessionUserMock: vi.fn(),
}));

vi.mock("@/app/_lib/auth/session", () => ({
  requireSessionUser: requireSessionUserMock,
  requireAdmin: vi.fn(),
  requirePermission: vi.fn(),
  requireDashboardUser: vi.fn(),
}));

describe("saved series actions", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
    requireSessionUserMock.mockReset();
    requireSessionUserMock.mockResolvedValue(testUsers.reader);
  });

  it("saves and removes a public series for the signed-in user", async () => {
    const series = await prisma.series.create({
      data: {
        title: "Saved Moon",
        slug: "saved-moon",
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    const saveResult = await saveSeriesAction({
      seriesId: series.id,
    });

    expect(saveResult.success).toBe(true);

    const savedSeries = await prisma.savedSeries.findUnique({
      where: {
        userId_seriesId: {
          userId: testUsers.reader.id,
          seriesId: series.id,
        },
      },
    });

    expect(savedSeries).not.toBeNull();

    const removeResult = await removeSavedSeriesAction({
      seriesId: series.id,
    });

    expect(removeResult.success).toBe(true);

    const removedSavedSeries = await prisma.savedSeries.findUnique({
      where: {
        userId_seriesId: {
          userId: testUsers.reader.id,
          seriesId: series.id,
        },
      },
    });

    expect(removedSavedSeries).toBeNull();
  });

  it("rejects hidden series", async () => {
    const series = await prisma.series.create({
      data: {
        title: "Hidden Moon",
        slug: "hidden-moon",
        visibility: SeriesVisibility.HIDDEN,
        createdById: testUsers.editor.id,
        updatedById: testUsers.editor.id,
      },
    });

    const result = await saveSeriesAction({
      seriesId: series.id,
    });

    expect(result.success).toBe(false);

    const savedSeries = await prisma.savedSeries.findMany({
      where: {
        userId: testUsers.reader.id,
      },
    });

    expect(savedSeries).toHaveLength(0);
  });
});
