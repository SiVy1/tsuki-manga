import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/app/_lib/db/client";

import {
  deleteTaxonomyTermAction,
  updateInstanceSettingsAction,
  upsertTaxonomyTermAction,
} from "@/app/_actions/settings/actions";
import { createSeriesAction } from "@/app/_actions/series/actions";
import {
  resetDatabaseAndStorage,
  seedDefaultUsers,
  testUsers,
} from "@/tests/integration/helpers/database";

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

describe("settings and taxonomy actions", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
    requirePermissionMock.mockReset();
    requireAdminMock.mockReset();
    requirePermissionMock.mockResolvedValue(testUsers.editor);
    requireAdminMock.mockResolvedValue(testUsers.admin);
  });

  it("creates and updates the singleton instance settings", async () => {
    const result = await updateInstanceSettingsAction({
      groupName: "Tsuki Scans",
      groupDescription: "Calm editorial team",
      siteTitle: "Tsuki Manga",
      siteDescription: "Read the latest chapters.",
      keywords: ["manga", "scanlation"],
    });

    expect(result.success).toBe(true);

    const settings = await prisma.instanceSettings.findFirst();

    expect(settings).not.toBeNull();
    expect(settings?.groupName).toBe("Tsuki Scans");
    expect(settings?.keywords).toEqual(["manga", "scanlation"]);
  });

  it("hard deletes taxonomy terms and detaches series relations", async () => {
    const createTaxonomyResult = await upsertTaxonomyTermAction({
      name: "Fantasy",
      type: "GENRE",
    });

    expect(createTaxonomyResult.success).toBe(true);

    if (!createTaxonomyResult.success) {
      throw new Error("taxonomy creation failed");
    }

    const termId = createTaxonomyResult.data.id;
    const createSeriesResult = await createSeriesAction({
      title: "Moonlit Tale",
      taxonomyTermIds: [termId],
    });

    expect(createSeriesResult.success).toBe(true);

    if (!createSeriesResult.success) {
      throw new Error("series creation failed");
    }

    const seriesBeforeDelete = await prisma.series.findUnique({
      where: { id: createSeriesResult.data.id },
      include: { taxonomyTerms: true },
    });

    expect(seriesBeforeDelete?.taxonomyTerms).toHaveLength(1);

    const deleteResult = await deleteTaxonomyTermAction({ id: termId });

    expect(deleteResult.success).toBe(true);

    const seriesAfterDelete = await prisma.series.findUnique({
      where: { id: createSeriesResult.data.id },
      include: { taxonomyTerms: true },
    });

    const taxonomyAfterDelete = await prisma.taxonomyTerm.findUnique({
      where: { id: termId },
    });

    expect(seriesAfterDelete?.taxonomyTerms).toHaveLength(0);
    expect(taxonomyAfterDelete).toBeNull();
  });
});
