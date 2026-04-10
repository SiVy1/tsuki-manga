import { createHash } from "node:crypto";

import { headers } from "next/headers";

import { prisma } from "@/app/_lib/db/client";
import { getEnv } from "@/app/_lib/settings/env";
import { getAppBaseUrl } from "@/app/_lib/settings/app-url";

const minSubmissionDelayMs = 3_000;
const duplicateCooldownMs = 45_000;
const rollingWindowMs = 60 * 60 * 1_000;
const maxRequestsPerWindow = 3;

function normalizeBaseUrl(input: string) {
  return input.replace(/\/+$/, "");
}

function normalizePath(input: string) {
  return input.replace(/\/+$/, "") || "/";
}

function extractSeriesSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/series\/([^/]+)$/);

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

function resolveClientIp(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  return headerValue.split(",")[0]?.trim() || null;
}

export async function resolveSeriesFromPublicInput(seriesUrl: string) {
  const baseUrl = normalizeBaseUrl(await getAppBaseUrl());
  const trimmed = seriesUrl.trim();

  let slug: string | null = null;

  if (trimmed.startsWith("/")) {
    slug = extractSeriesSlugFromPath(normalizePath(trimmed));
  } else {
    let parsed: URL;

    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }

    if (normalizeBaseUrl(parsed.origin) !== baseUrl) {
      return null;
    }

    slug = extractSeriesSlugFromPath(normalizePath(parsed.pathname));
  }

  if (!slug) {
    return null;
  }

  const series = await prisma.series.findFirst({
    where: {
      deletedAt: null,
      OR: [
        {
          slug,
        },
        {
          slugHistory: {
            some: {
              slug,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      visibility: true,
    },
  });

  return series;
}

export async function getRemovalRequestRequestContext() {
  const requestHeaders = await headers();
  const env = getEnv();
  const forwardedFor =
    requestHeaders.get("cf-connecting-ip") ??
    requestHeaders.get("x-real-ip") ??
    requestHeaders.get("x-forwarded-for");
  const ip = resolveClientIp(forwardedFor);
  const userAgent = requestHeaders.get("user-agent");
  const reporterIpHash = ip
    ? createHash("sha256")
        .update(env.AUTH_SECRET)
        .update(ip)
        .digest("hex")
    : null;

  return {
    reporterIpHash,
    userAgent,
  };
}

export function validateRemovalRequestTiming(renderedAt: number) {
  const now = Date.now();

  if (renderedAt > now + 5_000) {
    return "Form timestamp is invalid.";
  }

  if (now - renderedAt < minSubmissionDelayMs) {
    return "Please review the form before submitting.";
  }

  if (now - renderedAt > rollingWindowMs * 6) {
    return "This form expired. Reload the page and try again.";
  }

  return null;
}

export async function checkRemovalRequestAbuse(input: {
  seriesId: string;
  claimantEmail: string;
  reporterIpHash: string | null;
}) {
  const now = Date.now();
  const duplicateThreshold = new Date(now - duplicateCooldownMs);
  const windowThreshold = new Date(now - rollingWindowMs);

  const [recentDuplicate, openDuplicate, reporterWindowCount] = await Promise.all([
    prisma.seriesRemovalRequest.findFirst({
      where: {
        seriesId: input.seriesId,
        claimantEmail: input.claimantEmail,
        createdAt: {
          gte: duplicateThreshold,
        },
      },
      select: {
        id: true,
      },
    }),
    prisma.seriesRemovalRequest.findFirst({
      where: {
        seriesId: input.seriesId,
        claimantEmail: input.claimantEmail,
        status: {
          in: ["OPEN", "UNDER_REVIEW"],
        },
      },
      select: {
        id: true,
      },
    }),
    input.reporterIpHash
      ? prisma.seriesRemovalRequest.count({
          where: {
            reporterIpHash: input.reporterIpHash,
            createdAt: {
              gte: windowThreshold,
            },
          },
        })
      : Promise.resolve(0),
  ]);

  if (recentDuplicate) {
    return "A similar request was sent a moment ago. Please wait before trying again.";
  }

  if (openDuplicate) {
    return "An open request already exists for this series and email.";
  }

  if (input.reporterIpHash && reporterWindowCount >= maxRequestsPerWindow) {
    return "Too many removal requests were submitted from this network recently. Please try again later.";
  }

  return null;
}
