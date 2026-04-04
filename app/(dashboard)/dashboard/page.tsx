import Link from "next/link";

import { ChapterStatus } from "@/generated/prisma/client";

import { requireDashboardUser } from "@/app/_lib/auth/session";
import { getDashboardOverviewData } from "@/app/_lib/dashboard/queries";
import { formatDateTime, humanizeEnumValue } from "@/app/_lib/utils/formatting";

export default async function DashboardPage() {
  const user = await requireDashboardUser();
  const data = await getDashboardOverviewData();

  const primaryAction = (() => {
    if (data.latestDraft) {
      return {
        label: "Continue latest draft",
        href: `/dashboard/chapters/${data.latestDraft.id}`,
      };
    }

    if (data.metrics.seriesCount === 0) {
      return {
        label: "Create first series",
        href: "/dashboard/series/new",
      };
    }

    const latestSeries = data.recentSeries[0];

    if (latestSeries) {
      return {
        label: "Create chapter",
        href: `/dashboard/series/${latestSeries.id}#create-draft`,
      };
    }

    return {
      label: "Open chapters",
      href: "/dashboard/chapters",
    };
  })();

  const secondaryAction = (() => {
    if (data.metrics.seriesCount === 0) {
      return {
        label: "Open series",
        href: "/dashboard/series",
      };
    }

    return {
      label: "Open chapters",
      href: "/dashboard/chapters",
    };
  })();

  const metrics = [
    { label: "Series", value: data.metrics.seriesCount, href: "/dashboard/series" },
    { label: "Chapters", value: data.metrics.chapterCount, href: "/dashboard/chapters" },
    { label: "Published", value: data.metrics.publishedCount, href: "/dashboard/chapters" },
    { label: "Drafts", value: data.metrics.draftCount, href: "/dashboard/chapters" },
  ];
  const recentDrafts = data.recentChapters.filter((chapter) => chapter.status === "DRAFT");

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Overview</p>
          <h1 className="font-serif text-4xl">Dashboard</h1>
          <p className="text-sm text-muted">
            Start from the next useful action, not from metrics. Signed in as {user.rolePreset}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={primaryAction.href}
            className="rounded-full bg-foreground px-5 py-2.5 text-sm text-background transition hover:opacity-90"
          >
            {primaryAction.label}
          </Link>
          <Link
            href={secondaryAction.href}
            className="rounded-full border border-border px-4 py-2.5 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
          >
            {secondaryAction.label}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Needs attention</p>
              <h2 className="font-serif text-3xl">What to do next</h2>
            </div>
            <Link href="/dashboard/chapters" className="text-sm text-muted">
              Review chapters
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Latest draft</p>
              {data.latestDraft ? (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1">
                    <p className="font-medium">
                      Chapter {data.latestDraft.number}
                      {data.latestDraft.label ? ` ${data.latestDraft.label}` : ""}
                    </p>
                    <p className="text-sm text-muted">{data.latestDraft.series.title}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">
                      {data.latestDraft.pageCount} page{data.latestDraft.pageCount === 1 ? "" : "s"} · Updated{" "}
                      {formatDateTime(data.latestDraft.updatedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/chapters/${data.latestDraft.id}`}
                    className="inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background transition hover:opacity-90"
                  >
                    Continue draft
                  </Link>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-muted">
                    No draft is in progress yet.
                  </p>
                  <Link href={primaryAction.href} className="text-sm underline">
                    {primaryAction.label}
                  </Link>
                </div>
              )}
            </article>

            <article className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Upload missing</p>
              <div className="mt-3 space-y-3">
                <p className="font-serif text-3xl">{data.attention.draftsWithoutPagesCount}</p>
                <p className="text-sm text-muted">
                  Drafts still need their first chapter pages before preview or publish.
                </p>
                <Link href="/dashboard/chapters" className="text-sm underline">
                  Open drafts
                </Link>
              </div>
            </article>

            <article className="rounded-[1.5rem] bg-[var(--surface-muted)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Ready for publish</p>
              <div className="mt-3 space-y-3">
                <p className="font-serif text-3xl">{data.attention.draftsReadyCount}</p>
                <p className="text-sm text-muted">
                  Drafts already have pages and can move forward to preview and publish review.
                </p>
                <Link href="/dashboard/chapters" className="text-sm underline">
                  Review ready drafts
                </Link>
              </div>
            </article>
          </div>
        </article>

        <article className="panel p-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Shortcuts</p>
            <h2 className="font-serif text-3xl">Continue work</h2>
          </div>

          <div className="mt-6 space-y-3">
            {data.recentSeries.length ? (
              data.recentSeries.map((series) => (
                <Link
                  key={series.id}
                  href={`/dashboard/series/${series.id}`}
                  className="block rounded-[1rem] px-4 py-3 transition hover:bg-[var(--surface-hover)]"
                >
                  <p className="font-medium">{series.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {series.chapterCount} chapter{series.chapterCount === 1 ? "" : "s"} · Updated{" "}
                    {formatDateTime(series.updatedAt)}
                  </p>
                </Link>
              ))
            ) : (
              <div className="space-y-3 rounded-[1rem] bg-[var(--surface-muted)] px-4 py-4">
                <p className="text-sm text-muted">
                  No series exist yet. Create the first one to start the editorial flow.
                </p>
                <Link href="/dashboard/series/new" className="text-sm underline">
                  Create a series
                </Link>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <Link
                href="/dashboard/settings"
                className="block rounded-[1rem] px-4 py-3 text-sm transition hover:bg-[var(--surface-hover)] hover:text-foreground"
              >
                Instance settings
              </Link>
              <Link
                href="/dashboard/users"
                className="block rounded-[1rem] px-4 py-3 text-sm transition hover:bg-[var(--surface-hover)] hover:text-foreground"
              >
                User roles
              </Link>
              <Link
                href="/dashboard/trash/series"
                className="block rounded-[1rem] px-4 py-3 text-sm transition hover:bg-[var(--surface-hover)] hover:text-foreground"
              >
                Trash
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Continue work</p>
              <h2 className="mt-2 font-serif text-3xl">Recent drafts</h2>
            </div>
            <Link href="/dashboard/chapters" className="text-sm text-muted">
              Open chapters
            </Link>
          </div>

          <div className="mt-6 divide-y divide-border">
            {recentDrafts.length ? (
              recentDrafts.map((chapter) => (
                <Link
                  key={chapter.id}
                  href={`/dashboard/chapters/${chapter.id}`}
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted">
                      {chapter.series.title}
                    </p>
                    <p className="font-medium">
                      Chapter {chapter.number}
                      {chapter.label ? ` ${chapter.label}` : ""}
                    </p>
                    {chapter.title ? (
                      <p className="text-sm text-muted">{chapter.title}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2 text-right">
                    <span className="status-warning inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]">
                      Draft
                    </span>
                    <p className="text-xs text-muted">{formatDateTime(chapter.updatedAt)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="space-y-3 py-4">
                <p className="text-sm text-muted">
                  No drafts need work yet. Create a series or start the next chapter from an existing series.
                </p>
                <Link href={primaryAction.href} className="text-sm underline">
                  {primaryAction.label}
                </Link>
              </div>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Metrics</p>
              <h2 className="mt-2 font-serif text-3xl">Instance snapshot</h2>
            </div>
            <Link href="/dashboard/series" className="text-sm text-muted">
              Open series
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <Link
                key={metric.label}
                href={metric.href}
                className="rounded-[1rem] bg-[var(--surface-muted)] px-4 py-4 transition hover:bg-[var(--surface-hover)]"
              >
                <p className="text-xs uppercase tracking-[0.16em] text-muted">{metric.label}</p>
                <p className="mt-2 font-serif text-3xl">{metric.value}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Recent</p>
            <h2 className="mt-2 font-serif text-3xl">Latest changes</h2>
          </div>
          <Link href="/dashboard/chapters" className="text-sm text-muted">
            Open chapters
          </Link>
        </div>

        <div className="mt-6 divide-y divide-border">
          {data.recentChapters.length ? (
            data.recentChapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/dashboard/chapters/${chapter.id}`}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    {chapter.series.title}
                  </p>
                  <p className="font-medium">
                    Chapter {chapter.number}
                    {chapter.label ? ` ${chapter.label}` : ""}
                  </p>
                  {chapter.title ? (
                    <p className="text-sm text-muted">{chapter.title}</p>
                  ) : null}
                </div>
                <div className="space-y-2 text-right">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                      chapter.status === ChapterStatus.PUBLISHED
                        ? "status-success"
                        : "status-warning"
                    }`}
                  >
                    {humanizeEnumValue(chapter.status)}
                  </span>
                  <p className="text-xs text-muted">{formatDateTime(chapter.updatedAt)}</p>
                </div>
              </Link>
            ))
          ) : (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted">
                No chapters exist yet. Create the first series to start the editorial flow.
              </p>
              <Link href="/dashboard/series/new" className="text-sm underline">
                Create a series
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
