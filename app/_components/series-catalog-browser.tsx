"use client";

import { useDeferredValue, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type CatalogSeries = {
  id: string;
  title: string;
  slug: string;
  descriptionShort: string | null;
  coverUrl: string | null;
  latestChapter: {
    id: string;
    slug: string;
    number: string;
    label: string | null;
  } | null;
  taxonomyTerms: string[];
};

type SeriesCatalogBrowserProps = {
  series: CatalogSeries[];
};

export function SeriesCatalogBrowser({ series }: SeriesCatalogBrowserProps) {
  const [query, setQuery] = useState("");
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const availableTerms = Array.from(
    new Set(series.flatMap((entry) => entry.taxonomyTerms)),
  ).sort((left, right) => left.localeCompare(right));

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleSeries = series.filter((entry) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      entry.title.toLowerCase().includes(normalizedQuery) ||
      (entry.descriptionShort ?? "").toLowerCase().includes(normalizedQuery) ||
      entry.taxonomyTerms.some((term) => term.toLowerCase().includes(normalizedQuery));

    const matchesTerm = !activeTerm || entry.taxonomyTerms.includes(activeTerm);

    return matchesQuery && matchesTerm;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <input
          aria-label="Search series"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          className="min-w-[220px] flex-1 rounded-full border border-border bg-surface px-5 py-3 text-sm outline-none transition focus:border-foreground/25"
        />
        <button
          type="button"
          onClick={() => setFiltersVisible((current) => !current)}
          className="rounded-full border border-border px-4 py-3 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
        >
          Filters
        </button>
      </div>

      {filtersVisible ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTerm(null)}
            className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.14em] transition ${
              activeTerm === null
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted hover:border-foreground/20 hover:text-foreground"
            }`}
          >
            All
          </button>
          {availableTerms.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => setActiveTerm((current) => (current === term ? null : term))}
              className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.14em] transition ${
                activeTerm === term
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted hover:border-foreground/20 hover:text-foreground"
              }`}
            >
              {term}
            </button>
          ))}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-5">
        {visibleSeries.map((entry) => (
          <Link key={entry.id} href={`/series/${entry.slug}`} className="space-y-3">
            {entry.coverUrl ? (
              <Image
                src={entry.coverUrl}
                alt={entry.title}
                width={320}
                height={426}
                sizes="(max-width: 768px) 45vw, (max-width: 1200px) 30vw, 18vw"
                className="aspect-[3/4] h-auto w-full rounded-[1.6rem] object-cover transition duration-300 hover:scale-[1.02]"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center rounded-[1.6rem] bg-[var(--cover-fallback)] font-serif text-sm text-muted">
                {entry.title}
              </div>
            )}
            <div className="space-y-1">
              <h2 className="font-serif text-2xl leading-tight">{entry.title}</h2>
              {entry.latestChapter ? (
                <p className="text-xs uppercase tracking-[0.14em] text-muted">
                  Chapter {entry.latestChapter.number}
                  {entry.latestChapter.label ? ` ${entry.latestChapter.label}` : ""}
                </p>
              ) : (
                <p className="text-xs uppercase tracking-[0.14em] text-muted">No chapters</p>
              )}
            </div>
          </Link>
        ))}
      </section>

      {visibleSeries.length === 0 ? (
        <p className="text-sm text-muted">No series found.</p>
      ) : null}
    </div>
  );
}
