import { ChapterStatus, SeriesVisibility } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { isMissingOrUnavailableDatabaseError } from "@/app/_lib/db/errors";
import { buildAbsoluteUrl } from "@/app/_lib/seo/public-url";
import { getInstanceSettings } from "@/app/_lib/settings/instance";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildChapterTitle(entry: {
  series: { title: string };
  number: { toString(): string };
  label: string | null;
  title: string | null;
}) {
  const chapterParts = [`Chapter ${entry.number.toString()}`];

  if (entry.label) {
    chapterParts.push(entry.label);
  }

  const chapterContext = chapterParts.join(" ");

  if (entry.title) {
    return `${entry.series.title} - ${chapterContext}: ${entry.title}`;
  }

  return `${entry.series.title} - ${chapterContext}`;
}

function buildChapterDescription(entry: {
  series: { title: string };
  number: { toString(): string };
  label: string | null;
  title: string | null;
}) {
  const chapterParts = [`Chapter ${entry.number.toString()}`];

  if (entry.label) {
    chapterParts.push(entry.label);
  }

  if (entry.title) {
    chapterParts.push(entry.title);
  }

  return `${entry.series.title} - ${chapterParts.join(" ")}`;
}

export async function GET() {
  const homeUrl = await buildAbsoluteUrl();
  const instanceSettings = await getInstanceSettings();

  let chapters: Array<{
    id: string;
    slug: string;
    title: string | null;
    number: { toString(): string };
    label: string | null;
    publishedAt: Date | null;
    series: { title: string };
  }> = [];

  try {
    chapters = await prisma.chapter.findMany({
      where: {
        deletedAt: null,
        status: ChapterStatus.PUBLISHED,
        series: {
          deletedAt: null,
          visibility: SeriesVisibility.PUBLIC,
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        number: true,
        label: true,
        publishedAt: true,
        series: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 20,
    });
  } catch (error) {
    if (!isMissingOrUnavailableDatabaseError(error)) {
      throw error;
    }
  }

  const latestDate = chapters[0]?.publishedAt ?? new Date();
  const items = await Promise.all(
    chapters.map(async (entry) => {
      const chapterUrl = await buildAbsoluteUrl(`chapter/${entry.id}/${entry.slug}`);

      return [
        "<item>",
        `<title>${escapeXml(buildChapterTitle(entry))}</title>`,
        `<link>${escapeXml(chapterUrl)}</link>`,
        `<guid>${escapeXml(chapterUrl)}</guid>`,
        entry.publishedAt ? `<pubDate>${entry.publishedAt.toUTCString()}</pubDate>` : "",
        `<description>${escapeXml(buildChapterDescription(entry))}</description>`,
        "</item>",
      ]
        .filter(Boolean)
        .join("");
    }),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml(instanceSettings.siteTitle)}</title>`,
    `<link>${escapeXml(homeUrl)}</link>`,
    `<description>${escapeXml(instanceSettings.siteDescription)}</description>`,
    `<lastBuildDate>${latestDate.toUTCString()}</lastBuildDate>`,
    ...items,
    "</channel>",
    "</rss>",
  ].join("");

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
