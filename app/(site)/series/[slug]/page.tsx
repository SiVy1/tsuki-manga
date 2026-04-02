import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SeriesLongDescription } from "@/app/_components/series-long-description";
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
  const result = await getPublicSeriesOrThrow(slug);

  if (result.kind === "redirect") {
    redirect(`/series/${result.slug}`);
  }

  return (
    <main className="shell space-y-10 py-14">
      <section className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
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

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Series</p>
            <h1 className="font-serif text-5xl leading-tight">{result.series.title}</h1>
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
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl">Chapters</h2>
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
                    Chapter {chapter.number}
                    {chapter.label ? ` ${chapter.label}` : ""}
                  </p>
                  {chapter.title ? (
                    <p className="text-sm text-muted">{chapter.title}</p>
                  ) : null}
                </div>
                <span className="text-xs uppercase tracking-[0.16em] text-muted">
                  Read
                </span>
              </Link>
            ))
          ) : (
            <div className="px-5 py-8 text-sm text-muted">No published chapters.</div>
          )}
        </div>
      </section>
    </main>
  );
}
