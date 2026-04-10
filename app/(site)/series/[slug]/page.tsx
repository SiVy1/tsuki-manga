import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SeriesSaveButton } from "@/app/_components/series-save-button";
import { SeriesLongDescription } from "@/app/_components/series-long-description";
import { getOptionalSession } from "@/app/_lib/auth/session";
import { prisma } from "@/app/_lib/db/client";
import { getPublicSeriesOrThrow } from "@/app/_lib/reader/queries";
import { buildSeriesMetadata } from "@/app/_lib/seo/metadata";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicSeriesOrThrow(slug);

  if (result.kind === "redirect") {
    return {};
  }

  return buildSeriesMetadata(result.series);
}

export default async function SeriesPage({ params }: PageProps) {
  const { slug } = await params;
  const [result, session, t, common, entityT] = await Promise.all([
    getPublicSeriesOrThrow(slug),
    getOptionalSession(),
    getTranslations("SeriesPage"),
    getTranslations("Common.actions"),
    getTranslations("Common.entities"),
  ]);

  if (result.kind === "redirect") {
    redirect(`/series/${result.slug}`);
  }

  const savedSeries = session?.user
    ? await prisma.savedSeries.findUnique({
        where: {
          userId_seriesId: {
            userId: session.user.id,
            seriesId: result.series.id,
          },
        },
        select: {
          userId: true,
        },
      })
    : null;

  return (
    <main className="shell space-y-12 py-10 sm:space-y-14 sm:py-12 lg:py-14">
      <section className="grid gap-7 sm:gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        {result.series.coverUrl ? (
          <Image
            src={result.series.coverUrl}
            alt={result.series.title}
            width={480}
            height={640}
            sizes="(max-width: 1024px) 100vw, 280px"
            className="aspect-[3/4] h-auto w-full rounded-[1.8rem] object-cover"
          />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-[1.8rem] bg-[var(--cover-fallback)] font-serif text-sm text-muted">
            {result.series.title}
          </div>
        )}

        <div className="space-y-5 sm:space-y-6">
          <div className="space-y-3 sm:space-y-3.5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2.5 sm:space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-muted">{t("eyebrow")}</p>
                <h1 className="font-serif text-5xl leading-tight">{result.series.title}</h1>
              </div>

              <SeriesSaveButton
                seriesId={result.series.id}
                initialSaved={Boolean(savedSeries)}
                signedIn={Boolean(session?.user)}
              />
            </div>
            {result.series.descriptionShort ? (
              <p className="max-w-2xl text-base leading-8 text-muted">
                {result.series.descriptionShort}
              </p>
            ) : null}
          </div>

          {result.series.taxonomyTerms.length ? (
            <div className="flex flex-wrap gap-2">
              {result.series.taxonomyTerms.map((term) => (
                <span
                  key={term.id}
                  className="rounded-full border border-border px-3 py-2 text-xs uppercase tracking-[0.12em] text-muted"
                >
                  {term.name}
                </span>
              ))}
            </div>
          ) : null}

          {result.series.descriptionLong ? (
            <SeriesLongDescription description={result.series.descriptionLong} />
          ) : null}

          <div>
            <Link
              href={`/report-series?series=${encodeURIComponent(`/series/${result.series.slug}`)}`}
              className="text-sm text-muted underline underline-offset-4 transition hover:text-foreground"
            >
              {common("reportSeries")}
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-serif text-3xl">{t("chaptersTitle")}</h2>
        <div className="panel divide-y divide-border">
          {result.series.chapters.length ? (
            result.series.chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/chapter/${chapter.id}/${chapter.slug}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-black/2"
              >
                <div>
                  <p className="font-medium">
                    {entityT("chapter")} {chapter.number}
                    {chapter.label ? ` ${chapter.label}` : ""}
                  </p>
                  {chapter.title ? (
                    <p className="text-sm text-muted">{chapter.title}</p>
                  ) : null}
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  {common("read")}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-muted">{t("emptyChapters")}</div>
          )}
        </div>
      </section>
    </main>
  );
}
