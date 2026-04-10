import { prisma } from "@/app/_lib/db/client";
import { formatDateTime, humanizeEnumValue } from "@/app/_lib/utils/formatting";

import type { DashboardSeriesRemovalRequestItem } from "@/app/_lib/comments/types";

function mapRequestedActionLabel(value: string) {
  return humanizeEnumValue(value);
}

export async function getDashboardSeriesRemovalRequestsData(): Promise<
  DashboardSeriesRemovalRequestItem[]
> {
  const requests = await prisma.seriesRemovalRequest.findMany({
    orderBy: [
      {
        createdAt: "desc",
      },
    ],
    include: {
      series: {
        select: {
          id: true,
          slug: true,
          title: true,
          visibility: true,
        },
      },
    },
  });

  const reporterIpHashes = Array.from(
    new Set(
      requests
        .map((request) => request.reporterIpHash)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const openCountsByIp = new Map<string, number>();

  if (reporterIpHashes.length) {
    const openRequests = await prisma.seriesRemovalRequest.findMany({
      where: {
        reporterIpHash: {
          in: reporterIpHashes,
        },
        status: {
          in: ["OPEN", "UNDER_REVIEW"],
        },
      },
      select: {
        reporterIpHash: true,
      },
    });

    for (const row of openRequests) {
      if (row.reporterIpHash) {
        openCountsByIp.set(row.reporterIpHash, (openCountsByIp.get(row.reporterIpHash) ?? 0) + 1);
      }
    }
  }

  return requests.map((request) => ({
    id: request.id,
    status: request.status,
    statusLabel: humanizeEnumValue(request.status),
    createdAtLabel: formatDateTime(request.createdAt),
    reviewedAtLabel: request.reviewedAt ? formatDateTime(request.reviewedAt) : null,
    requestedActionLabel: mapRequestedActionLabel(request.requestedAction),
    claimantName: request.claimantName,
    claimantEmail: request.claimantEmail,
    claimantRoleLabel: humanizeEnumValue(request.claimantRole),
    organizationName: request.organizationName,
    workDescription: request.workDescription,
    infringementExplanation: request.infringementExplanation,
    additionalDetails: request.additionalDetails,
    adminNote: request.adminNote,
    resolutionNote: request.resolutionNote,
    electronicSignature: request.electronicSignature,
    reporterIpHash: request.reporterIpHash,
    sameIpOpenCount: request.reporterIpHash
      ? openCountsByIp.get(request.reporterIpHash) ?? 0
      : 0,
    series: {
      id: request.series.id,
      slug: request.series.slug,
      title: request.series.title,
      visibility: request.series.visibility,
    },
  }));
}
