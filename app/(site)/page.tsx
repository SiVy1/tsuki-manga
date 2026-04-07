import Image from "next/image";
import Link from "next/link";

import { HomeContinueReading } from "@/app/_components/home-continue-reading";
import { HomeCoverCloud } from "@/app/_components/home-cover-cloud";
import { PublicSeriesCard } from "@/app/_components/public-series-card";
import { getSiteContent } from "@/app/_lib/content/site-content";
import { getHomePageData } from "@/app/_lib/reader/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [data, siteContent] = await Promise.all([getHomePageData(), getSiteContent()]);
  const heroCovers = Array.from(
    new Map(
      data.latestChapters
        .filter((chapter) => chapter.series.coverUrl)
        .map((chapter) => [
          chapter.series.id,
          {
            id: chapter.series.id,
            title: chapter.series.title,
            coverUrl: chapter.series.coverUrl,
          },
        ]),
    ).values(),
  );

  return (
    <main className="flex-1 py-10 md:py-14">
      <section className="shell relative overflow-hidden rounded-[2rem] bg-surface/82 px-6 py-12 md:px-12 md:py-16 lg:min-h-[27rem]">
        <HomeCoverCloud covers={heroCovers} />

        <div className="relative z-10 mx-auto max-w-3xl space-y-5 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">
            {data.instanceSettings.groupName}
          </p>
          <h1 className="font-serif text-5xl leading-[1.05] md:text-7xl">
            {data.instanceSettings.groupName}
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-8 text-muted md:text-base">
            {data.instanceSettings.groupDescription ??
              data.instanceSettings.siteDescription ??
              "Reader-first releases from one scanlation group."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link
              href="/series"
              className="rounded-full bg-foreground px-5 py-3 text-background transition hover:opacity-90"
            >
              Browse series
            </Link>
            <Link
              href="#latest"
              className="rounded-full border border-border px-5 py-3 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              Latest updates
            </Link>
          </div>
        </div>
      </section>

      <div style={{ marginTop: "clamp(4.25rem, 7vw, 6.5rem)" }}>
        <HomeContinueReading />
      </div>

      {siteContent.recruitment.enabled ? (
        <section
          className="shell"
          style={{ marginTop: "clamp(3rem, 5vw, 4.5rem)" }}
        >
          <div className="flex flex-col gap-4 border-t border-border/70 py-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-muted">Recruitment</p>
              <h2 className="font-serif text-3xl md:text-[2.1rem]">
                {siteContent.recruitment.title}
              </h2>
              {siteContent.recruitment.summary ? (
                <p className="text-sm leading-7 text-muted">
                  {siteContent.recruitment.summary}
                </p>
              ) : null}
            </div>

            <Link
              href="/recruitment"
              className="text-sm text-muted underline underline-offset-4 transition hover:text-foreground"
            >
              View open roles
            </Link>
          </div>
        </section>
      ) : null}

      {data.featuredSeries.length ? (
        <section
          className="shell space-y-6 md:space-y-7"
          style={{ marginTop: "clamp(3.25rem, 6vw, 5.25rem)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">
                Featured series
              </p>
              <h2 className="font-serif text-3xl md:text-4xl">More to explore</h2>
            </div>
            <Link href="/series" className="text-sm text-muted">
              All series
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-y-10 xl:grid-cols-4">
            {data.featuredSeries.map((series) => (
              <PublicSeriesCard key={series.id} series={series} />
            ))}
          </div>
        </section>
      ) : null}

      <section
        id="latest"
        className="shell space-y-6 md:space-y-7"
        style={{ marginTop: "clamp(3.25rem, 6vw, 5.5rem)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-3xl md:text-4xl">Latest updates</h2>
          <Link href="/series" className="text-sm text-muted">
            All series
          </Link>
        </div>

        {data.latestChapters.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 md:gap-y-10 xl:grid-cols-4">
            {data.latestChapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/chapter/${chapter.id}/${chapter.slug}`}
                className="space-y-3"
              >
                {chapter.series.coverUrl ? (
                  <Image
                    src={chapter.series.coverUrl}
                    alt={chapter.series.title}
                    width={320}
                    height={426}
                    sizes="(max-width: 768px) 45vw, (max-width: 1200px) 30vw, 22vw"
                    className="aspect-[3/4] h-auto w-full rounded-[1.6rem] object-cover transition duration-300 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-[1.6rem] bg-[var(--cover-fallback)] font-serif text-sm text-muted">
                    {chapter.series.title}
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    {chapter.series.title}
                  </p>
                  <p className="font-serif text-2xl leading-tight">
                    Chapter {chapter.number}
                    {chapter.label ? ` ${chapter.label}` : ""}
                  </p>
                  {chapter.title ? (
                    <p className="text-sm leading-6 text-muted">{chapter.title}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.6rem] bg-surface/70 px-6 py-10 text-sm text-muted">
            No published chapters.
          </div>
        )}
      </section>
    </main>
  );
}
