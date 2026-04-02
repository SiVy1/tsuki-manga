import Image from "next/image";
import Link from "next/link";

import { requirePermission } from "@/app/_lib/auth/session";
import { getDashboardSeriesListData } from "@/app/_lib/dashboard/queries";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { formatDateTime, humanizeEnumValue } from "@/app/_lib/utils/formatting";

export default async function DashboardSeriesPage() {
  await requirePermission(PermissionBits.SERIES);
  const data = await getDashboardSeriesListData();

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Series</p>
          <h1 className="font-serif text-4xl">Series</h1>
        </div>
        <Link
          href="/dashboard/series/new"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm text-background transition hover:opacity-90"
        >
          New series
        </Link>
      </section>

      <section className="panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-5 py-4 text-xs uppercase tracking-[0.16em] text-muted md:grid-cols-[84px_minmax(0,2fr)_140px_160px_170px]">
          <span>Cover</span>
          <span>Series</span>
          <span>Visibility</span>
          <span>Taxonomy</span>
          <span>Updated</span>
        </div>

        <div className="divide-y divide-border">
          {data.series.length ? (
            data.series.map((series) => (
              <Link
                key={series.id}
                href={`/dashboard/series/${series.id}`}
                className="grid gap-4 px-5 py-4 transition hover:bg-black/2 md:grid-cols-[84px_minmax(0,2fr)_140px_160px_170px]"
              >
                <div className="overflow-hidden rounded-2xl bg-[var(--surface-muted)]">
                  {series.coverUrl ? (
                    <Image
                      src={series.coverUrl}
                      alt={series.title}
                      width={84}
                      height={112}
                      className="aspect-[3/4] h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center font-serif text-sm text-muted">
                      TM
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <h2 className="font-serif text-2xl">{series.title}</h2>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">
                      /series/{series.slug}
                    </p>
                  </div>
                  <p className="text-sm text-muted">
                    {series.chapterCount} chapter{series.chapterCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex items-start">
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                      series.visibility === "PUBLIC"
                        ? "status-success"
                        : "status-warning"
                    }`}
                  >
                    {humanizeEnumValue(series.visibility)}
                  </span>
                </div>

                <div className="text-sm text-muted">
                  {series.taxonomyTerms.length ? series.taxonomyTerms.join(", ") : "No terms"}
                </div>

                <div className="text-sm text-muted">{formatDateTime(series.updatedAt)}</div>
              </Link>
            ))
          ) : (
            <div className="space-y-3 px-5 py-10">
              <p className="text-sm text-muted">
                No series exist yet. Create the first one to open the publishing flow.
              </p>
              <div>
                <Link href="/dashboard/series/new" className="text-sm underline">
                  Create a series
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
