"use client";

import { useDeferredValue, useState } from "react";

import {
  PublicSeriesCard,
  type PublicSeriesCardData,
} from "@/app/_components/public-series-card";

type CatalogSeries = PublicSeriesCardData & {
  descriptionShort: string | null;
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
  const hasQuery = query.trim().length > 0;
  const hasActiveFilter = activeTerm !== null;
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
      <div className="space-y-4">
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
            aria-expanded={filtersVisible}
            className="rounded-full border border-border px-4 py-3 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
          >
            {filtersVisible ? "Hide filters" : "Filters"}
          </button>
        </div>

        {hasActiveFilter || hasQuery ? (
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted">
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={() => setActiveTerm(null)}
                className="rounded-full border border-border px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-foreground transition hover:border-foreground/25"
              >
                {activeTerm}
              </button>
            ) : null}

            {hasQuery ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full border border-border/80 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-muted transition hover:border-foreground/20 hover:text-foreground"
              >
                Search: {query.trim()}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setActiveTerm(null);
                setQuery("");
              }}
              className="px-1 py-2 text-[11px] uppercase tracking-[0.18em] text-muted transition hover:text-foreground"
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>

      {filtersVisible ? (
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Browse by tag</p>
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
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em] text-muted">
        <p>
          {visibleSeries.length} of {series.length} series
        </p>
        {hasActiveFilter || hasQuery ? <p>Filtered</p> : null}
      </div>

      <section className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-5">
        {visibleSeries.map((entry) => (
          <PublicSeriesCard key={entry.id} series={entry} />
        ))}
      </section>

      {visibleSeries.length === 0 ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-serif text-2xl">No matching series</p>
            <p className="text-sm text-muted">
              Try another search or clear the current filter to browse the full catalog.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {hasQuery ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full border border-border px-4 py-3 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
              >
                Clear search
              </button>
            ) : null}
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={() => setActiveTerm(null)}
                className="rounded-full border border-border px-4 py-3 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
              >
                Clear filter
              </button>
            ) : null}
            {hasQuery || hasActiveFilter ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveTerm(null);
                }}
                className="rounded-full bg-foreground px-4 py-3 text-sm text-background transition hover:opacity-90"
              >
                Reset catalog
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
