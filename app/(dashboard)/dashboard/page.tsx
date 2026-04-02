import Link from "next/link";

import { requireDashboardUser } from "@/app/_lib/auth/session";
import { getDashboardOverviewData } from "@/app/_lib/dashboard/queries";
import { formatDateTime, humanizeEnumValue } from "@/app/_lib/utils/formatting";

export default async function DashboardPage() {
  const [user, data] = await Promise.all([
    requireDashboardUser(),
    getDashboardOverviewData(),
  ]);

  const metrics = [
    { label: "Series", value: data.metrics.seriesCount, href: "/dashboard/series" },
    { label: "Chapters", value: data.metrics.chapterCount, href: "/dashboard/chapters" },
    {
      label: "Published",
      value: data.metrics.publishedCount,
      href: "/dashboard/chapters",
    },
    { label: "Drafts", value: data.metrics.draftCount, href: "/dashboard/chapters" },
  ];
  const recentDrafts = data.recentChapters.filter((chapter) => chapter.status === "DRAFT");
  const recentPublished = data.recentChapters.filter(
    (chapter) => chapter.status === "PUBLISHED",
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Overview</p>
          <h1 className="font-serif text-4xl">Dashboard</h1>
          <p className="text-sm text-muted">{user.rolePreset}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/series/new"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm text-background transition hover:opacity-90"
          >
            New series
          </Link>
          <Link
            href="/dashboard/chapters"
            className="rounded-full border border-border px-4 py-2.5 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
          >
            Open chapters
          </Link>
        </div>
      </section>

      <section className="panel p-4 md:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Drafts</p>
              <h2 className="mt-2 font-serif text-3xl">Needs work</h2>
            </div>
            <Link href="/dashboard/chapters" className="text-sm text-muted">
              All chapters
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
                  No drafts need work yet. Start a new series or create the first chapter from an
                  existing series.
                </p>
                <Link href="/dashboard/series/new" className="text-sm underline">
                  Create a series
                </Link>
              </div>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">Published</p>
              <h2 className="mt-2 font-serif text-3xl">Live now</h2>
            </div>
            <Link href="/dashboard/chapters" className="text-sm text-muted">
              View list
            </Link>
          </div>

          <div className="mt-6 divide-y divide-border">
            {recentPublished.length ? (
              recentPublished.map((chapter) => (
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
                    <span className="status-success inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]">
                      Published
                    </span>
                    <p className="text-xs text-muted">{formatDateTime(chapter.updatedAt)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="space-y-3 py-4">
                <p className="text-sm text-muted">
                  Nothing is live yet. Publish a finished draft to see it here.
                </p>
                <Link href="/dashboard/chapters" className="text-sm underline">
                  Review chapters
                </Link>
              </div>
            )}
          </div>
        </article>

        <article className="panel space-y-4 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Shortcuts</p>
          <div className="space-y-3">
            <Link
              href="/dashboard/series/new"
              className="block rounded-[1rem] px-4 py-3 text-sm transition hover:bg-[var(--surface-hover)] hover:text-foreground"
            >
              New series
            </Link>
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
                      chapter.status === "PUBLISHED"
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
