import type { Metadata } from "next";

import { getInstanceSettings } from "@/app/_lib/settings/instance";
import { buildAbsoluteUrl, getDefaultOgImageUrl } from "@/app/_lib/seo/public-url";

type RootMetadataInput = {
  siteTitle: string;
  siteDescription: string;
  keywords: string[];
};

function buildKeywords(keywords: string[]) {
  return keywords.length ? keywords : undefined;
}

function buildOpenGraphImage(url: string) {
  return [
    {
      url,
    },
  ];
}

export async function buildRootMetadata(
  settings?: RootMetadataInput,
): Promise<Metadata> {
  const [baseUrl, resolvedSettings, defaultOgImageUrl] = await Promise.all([
    buildAbsoluteUrl(),
    settings ? Promise.resolve(settings) : getInstanceSettings(),
    getDefaultOgImageUrl(),
  ]);

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: resolvedSettings.siteTitle,
      template: `%s | ${resolvedSettings.siteTitle}`,
    },
    description: resolvedSettings.siteDescription,
    keywords: buildKeywords(resolvedSettings.keywords),
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      type: "website",
      url: baseUrl,
      title: resolvedSettings.siteTitle,
      description: resolvedSettings.siteDescription,
      images: buildOpenGraphImage(defaultOgImageUrl),
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedSettings.siteTitle,
      description: resolvedSettings.siteDescription,
      images: [defaultOgImageUrl],
    },
  };
}

export async function buildSeriesMetadata(series: {
  title: string;
  descriptionShort: string | null;
  descriptionLong: string | null;
  slug: string;
  coverUrl?: string | null;
}) {
  const [instanceSettings, canonicalUrl, defaultOgImageUrl] = await Promise.all([
    getInstanceSettings(),
    buildAbsoluteUrl(`series/${series.slug}`),
    getDefaultOgImageUrl(),
  ]);
  const description =
    series.descriptionShort ??
    series.descriptionLong ??
    instanceSettings.siteDescription;
  const ogImage = series.coverUrl ?? defaultOgImageUrl;

  return {
    title: series.title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    keywords: buildKeywords(instanceSettings.keywords),
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: series.title,
      description,
      images: buildOpenGraphImage(ogImage),
    },
    twitter: {
      card: "summary_large_image",
      title: series.title,
      description,
      images: [ogImage],
    },
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
  const [instanceSettings, canonicalUrl, defaultOgImageUrl] = await Promise.all([
    getInstanceSettings(),
    buildAbsoluteUrl(`chapter/${chapter.id}/${chapter.slug}`),
    getDefaultOgImageUrl(),
  ]);

  const chapterLabel = chapter.title
    ? chapter.title
    : `Chapter ${chapter.number}${chapter.label ? ` ${chapter.label}` : ""}`;
  const description = `${chapter.series.title} - ${chapterLabel}`;

  return {
    title: `${chapter.series.title} - ${chapterLabel}`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    keywords: buildKeywords(instanceSettings.keywords),
    openGraph: {
      type: "article",
      url: canonicalUrl,
      title: `${chapter.series.title} - ${chapterLabel}`,
      description,
      images: buildOpenGraphImage(defaultOgImageUrl),
    },
    twitter: {
      card: "summary_large_image",
      title: `${chapter.series.title} - ${chapterLabel}`,
      description,
      images: [defaultOgImageUrl],
    },
  } satisfies Metadata;
}
