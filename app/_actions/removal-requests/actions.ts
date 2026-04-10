"use server";

import { revalidatePath } from "next/cache";

import { SeriesRemovalRequestStatus, SeriesVisibility } from "@/generated/prisma/client";

import { requireAdmin } from "@/app/_lib/auth/session";
import { prisma } from "@/app/_lib/db/client";
import { checkRemovalRequestAbuse, getRemovalRequestRequestContext, resolveSeriesFromPublicInput, validateRemovalRequestTiming } from "@/app/_lib/removal-requests/service";
import { fail, ok } from "@/app/_lib/utils/action-result";
import {
  createSeriesRemovalRequestInputSchema,
  updateSeriesRemovalRequestStatusInputSchema,
} from "@/app/_lib/validation/removal-requests";

function revalidateRemovalRequestSurfaces() {
  revalidatePath("/report-series");
  revalidatePath("/dashboard/removal-requests");
}

export async function createSeriesRemovalRequestAction(rawInput: unknown) {
  const parsed = createSeriesRemovalRequestInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid removal request.");
  }

  if (parsed.data.website) {
    return ok({
      ignored: true,
    });
  }

  const timingError = validateRemovalRequestTiming(parsed.data.renderedAt);

  if (timingError) {
    return fail(timingError);
  }

  const series = await resolveSeriesFromPublicInput(parsed.data.seriesUrl);

  if (!series) {
    return fail("Enter a valid URL for a series published on this instance.");
  }

  const requestContext = await getRemovalRequestRequestContext();
  const abuseError = await checkRemovalRequestAbuse({
    seriesId: series.id,
    claimantEmail: parsed.data.claimantEmail,
    reporterIpHash: requestContext.reporterIpHash,
  });

  if (abuseError) {
    return fail(abuseError);
  }

  const request = await prisma.seriesRemovalRequest.create({
    data: {
      seriesId: series.id,
      claimantName: parsed.data.claimantName,
      organizationName: parsed.data.organizationName,
      claimantEmail: parsed.data.claimantEmail,
      claimantRole: parsed.data.claimantRole,
      workDescription: parsed.data.claimSummary,
      infringementExplanation: parsed.data.claimSummary,
      requestedAction: "REMOVE_SERIES",
      additionalDetails: null,
      electronicSignature: parsed.data.electronicSignature,
      goodFaithConfirmed: parsed.data.goodFaithConfirmed,
      accuracyConfirmed: parsed.data.accuracyConfirmed,
      reporterIpHash: requestContext.reporterIpHash,
      userAgent: requestContext.userAgent,
      status: SeriesRemovalRequestStatus.OPEN,
    },
    select: {
      id: true,
      series: {
        select: {
          title: true,
        },
      },
    },
  });

  revalidateRemovalRequestSurfaces();

  return ok({
    requestId: request.id,
    seriesTitle: request.series.title,
  });
}

export async function updateSeriesRemovalRequestStatusAction(rawInput: unknown) {
  const user = await requireAdmin();
  const parsed = updateSeriesRemovalRequestStatusInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid moderation input.");
  }

  const request = await prisma.seriesRemovalRequest.findUnique({
    where: {
      id: parsed.data.requestId,
    },
    include: {
      series: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!request) {
    return fail("Removal request was not found.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.seriesRemovalRequest.update({
      where: {
        id: request.id,
      },
      data: {
        status: parsed.data.status,
        adminNote: parsed.data.adminNote,
        resolutionNote: parsed.data.resolutionNote,
        reviewedAt:
          parsed.data.status === SeriesRemovalRequestStatus.OPEN
            ? null
            : new Date(),
        reviewedById:
          parsed.data.status === SeriesRemovalRequestStatus.OPEN
            ? null
            : user.id,
      },
    });

    if (parsed.data.status === SeriesRemovalRequestStatus.RESOLVED_ACCEPTED) {
      await transaction.series.update({
        where: {
          id: request.series.id,
        },
        data: {
          visibility: SeriesVisibility.HIDDEN,
          updatedById: user.id,
        },
      });
    }
  });

  revalidateRemovalRequestSurfaces();
  revalidatePath(`/series/${request.series.slug}`);
  revalidatePath("/series");
  revalidatePath("/");

  return ok({
    requestId: request.id,
    status: parsed.data.status,
  });
}
