import { beforeEach, describe, expect, it, vi } from "vitest";

import { SeriesRemovalRequestStatus } from "@/generated/prisma/client";

import { createSeriesRemovalRequestAction, updateSeriesRemovalRequestStatusAction } from "@/app/_actions/removal-requests/actions";
import { createSeriesAction } from "@/app/_actions/series/actions";
import { prisma } from "@/app/_lib/db/client";
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

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get(name: string) {
      switch (name) {
        case "x-forwarded-for":
          return "203.0.113.10";
        case "user-agent":
          return "Vitest";
        default:
          return null;
      }
    },
  })),
}));

vi.mock("@/app/_lib/settings/app-url", () => ({
  getAppBaseUrl: vi.fn(async () => "http://localhost:3000"),
}));

describe("series removal request flow", () => {
  beforeEach(async () => {
    await resetDatabaseAndStorage();
    await seedDefaultUsers();
    requirePermissionMock.mockReset();
    requireAdminMock.mockReset();
    requirePermissionMock.mockResolvedValue(testUsers.editor);
    requireAdminMock.mockResolvedValue(testUsers.admin);
  });

  it("creates a formal public request and can accept it by hiding the series", async () => {
    const seriesResult = await createSeriesAction({
      title: "Formal Request Target",
    });

    if (!seriesResult.success) {
      throw new Error("series creation failed");
    }

    const requestResult = await createSeriesRemovalRequestAction({
      seriesUrl: `http://localhost:3000/series/${seriesResult.data.slug}`,
      claimantName: "Akira Mori",
      organizationName: "North Moon Rights",
      claimantEmail: "legal@example.com",
      claimantRole: "COPYRIGHT_OWNER",
      claimSummary: "Original manga publication owned by the claimant. This series is being published here without authorization from the rights holder. Please remove public access while the claim is reviewed.",
      electronicSignature: "Akira Mori",
      goodFaithConfirmed: true,
      accuracyConfirmed: true,
      renderedAt: Date.now() - 10_000,
      website: "",
    });

    expect(requestResult.success).toBe(true);

    const storedRequest = await prisma.seriesRemovalRequest.findFirstOrThrow({
      where: {
        claimantEmail: "legal@example.com",
      },
    });

    expect(storedRequest.status).toBe("OPEN");

    const acceptResult = await updateSeriesRemovalRequestStatusAction({
      requestId: storedRequest.id,
      status: SeriesRemovalRequestStatus.RESOLVED_ACCEPTED,
      adminNote: "Formal request looks valid.",
      resolutionNote: "Series hidden pending follow-up.",
    });

    expect(acceptResult.success).toBe(true);

    const updatedRequest = await prisma.seriesRemovalRequest.findUniqueOrThrow({
      where: {
        id: storedRequest.id,
      },
    });
    const updatedSeries = await prisma.series.findUniqueOrThrow({
      where: {
        id: seriesResult.data.id,
      },
    });

    expect(updatedRequest.status).toBe("RESOLVED_ACCEPTED");
    expect(updatedRequest.reviewedById).toBe(testUsers.admin.id);
    expect(updatedSeries.visibility).toBe("HIDDEN");
  });

  it("rejects a duplicate open request for the same series and email", async () => {
    const seriesResult = await createSeriesAction({
      title: "Duplicate Request Target",
    });

    if (!seriesResult.success) {
      throw new Error("series creation failed");
    }

    const firstResult = await createSeriesRemovalRequestAction({
      seriesUrl: `http://localhost:3000/series/${seriesResult.data.slug}`,
      claimantName: "Mina Ito",
      organizationName: "",
      claimantEmail: "notice@example.com",
      claimantRole: "AUTHORIZED_AGENT",
      claimSummary: "A protected work represented by the claimant. The uploaded series reproduces protected pages without permission.",
      electronicSignature: "Mina Ito",
      goodFaithConfirmed: true,
      accuracyConfirmed: true,
      renderedAt: Date.now() - 8_000,
      website: "",
    });

    expect(firstResult.success).toBe(true);

    const duplicateResult = await createSeriesRemovalRequestAction({
      seriesUrl: `http://localhost:3000/series/${seriesResult.data.slug}`,
      claimantName: "Mina Ito",
      organizationName: "",
      claimantEmail: "notice@example.com",
      claimantRole: "AUTHORIZED_AGENT",
      claimSummary: "A protected work represented by the claimant. The uploaded series reproduces protected pages without permission.",
      electronicSignature: "Mina Ito",
      goodFaithConfirmed: true,
      accuracyConfirmed: true,
      renderedAt: Date.now() - 8_000,
      website: "",
    });

    expect(duplicateResult.success).toBe(false);

    if (duplicateResult.success) {
      throw new Error("duplicate request should fail");
    }

    expect(duplicateResult.error).toContain("open request already exists");
  });
});
