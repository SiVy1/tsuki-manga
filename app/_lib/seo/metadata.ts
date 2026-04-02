import type { Metadata } from "next";

import { getAppBaseUrl } from "@/app/_lib/settings/app-url";
import { getInstanceSettings } from "@/app/_lib/settings/instance";

type RootMetadataInput = {
  siteTitle: string;
  siteDescription: string;
  keywords: string[];
};

function buildKeywords(keywords: string[]) {
  return keywords.length ? keywords : undefined;
}

export async function buildRootMetadata(
  settings?: RootMetadataInput,
): Promise<Metadata> {
  const [baseUrl, resolvedSettings] = await Promise.all([
    getAppBaseUrl(),
    settings ? Promise.resolve(settings) : getInstanceSettings(),
  ]);

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: resolvedSettings.siteTitle,
      template: `%s | ${resolvedSettings.siteTitle}`,
    },
    description: resolvedSettings.siteDescription,
    keywords: buildKeywords(resolvedSettings.keywords),
  };
}

export async function buildSeriesMetadata(series: {
  title: string;
  descriptionShort: string | null;
  descriptionLong: string | null;
  slug: string;
}) {
  const [baseUrl, instanceSettings] = await Promise.all([
    getAppBaseUrl(),
    getInstanceSettings(),
  ]);

  return {
    title: series.title,
    description:
      series.descriptionShort ??
      series.descriptionLong ??
      instanceSettings.siteDescription,
    alternates: {
      canonical: `${baseUrl}/series/${series.slug}`,
    },
    keywords: buildKeywords(instanceSettings.keywords),
  } satisfies Metadata;
}

export async function buildChapterMetadata(chapter: {
  id: string;
  slug: string;
  title: string | null;
  number: string;
  label: string | null;
  series: {
    title: string;
  };
}) {
  const [baseUrl, instanceSettings] = await Promise.all([
    getAppBaseUrl(),
    getInstanceSettings(),
  ]);

  const chapterLabel = chapter.title
    ? chapter.title
    : `Chapter ${chapter.number}${chapter.label ? ` ${chapter.label}` : ""}`;

  return {
    title: `${chapter.series.title} - ${chapterLabel}`,
    description: instanceSettings.siteDescription,
    alternates: {
      canonical: `${baseUrl}/chapter/${chapter.id}/${chapter.slug}`,
    },
    keywords: buildKeywords(instanceSettings.keywords),
  } satisfies Metadata;
}
