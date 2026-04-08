import { CommentReportStatus } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { formatDateTime, humanizeEnumValue } from "@/app/_lib/utils/formatting";

import type { DashboardCommentReportItem } from "@/app/_lib/comments/types";

function resolveAuthorName(input: {
  displayName: string | null;
  name: string | null;
}) {
  return input.displayName ?? input.name ?? "Reader";
}

function buildCommentExcerpt(input: {
  status: string;
  body: string;
}) {
  if (input.status === "DELETED") {
    return "Comment removed.";
  }

  if (input.status === "HIDDEN") {
    return "Comment hidden by moderation.";
  }

  const normalized = input.body.replace(/\s+/g, " ").trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177)}...`;
}

function mapChapterNumber(value: { toString(): string }) {
  return value.toString();
}

export async function getDashboardCommentReportsData(): Promise<DashboardCommentReportItem[]> {
  const reports = await prisma.commentReport.findMany({
    where: {
      status: CommentReportStatus.OPEN,
      comment: {
        chapter: {
          deletedAt: null,
        },
      },
    },
    include: {
      comment: {
        include: {
          author: {
            select: {
              name: true,
              displayName: true,
            },
          },
          chapter: {
            include: {
              series: {
                select: {
                  title: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const grouped = new Map<string, typeof reports>();

  for (const report of reports) {
    const existing = grouped.get(report.commentId) ?? [];
    existing.push(report);
    grouped.set(report.commentId, existing);
  }

  return Array.from(grouped.values())
    .map((group) => {
      const latest = group[0];

      return {
        id: latest.comment.id,
        latestReportId: latest.id,
        reportCount: group.length,
        latestReason: latest.reason,
        latestReasonLabel: humanizeEnumValue(latest.reason),
        latestCreatedAt: latest.createdAt.toISOString(),
        latestCreatedAtLabel: formatDateTime(latest.createdAt),
        latestDetails: latest.details,
        comment: {
          id: latest.comment.id,
          status: latest.comment.status,
          excerpt: buildCommentExcerpt({
            status: latest.comment.status,
            body: latest.comment.body,
          }),
          createdAtLabel: formatDateTime(latest.comment.createdAt),
          authorName: latest.comment.author
            ? resolveAuthorName(latest.comment.author)
            : "Reader",
          chapter: {
            id: latest.comment.chapter.id,
            slug: latest.comment.chapter.slug,
            number: mapChapterNumber(latest.comment.chapter.number),
            label: latest.comment.chapter.label,
            title: latest.comment.chapter.title,
            seriesTitle: latest.comment.chapter.series.title,
            seriesSlug: latest.comment.chapter.series.slug,
          },
        },
      };
    })
    .sort((left, right) => right.latestCreatedAt.localeCompare(left.latestCreatedAt));
}
