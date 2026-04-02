import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReadingMode } from "@/generated/prisma/client";

import { saveReadingModePreferenceAction } from "@/app/_actions/preferences/actions";
import { ChapterReader } from "@/app/_components/chapter-reader";
import { getOptionalSession } from "@/app/_lib/auth/session";
import { prisma } from "@/app/_lib/db/client";
import { getPublicChapterOrThrow } from "@/app/_lib/reader/queries";
import { buildChapterMetadata } from "@/app/_lib/seo/metadata";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    chapterId: string;
    slug: string;
  }>;
};

function formatChapterLabel(input: {
  number: string;
  label?: string | null;
  title?: string | null;
}) {
  const suffix = input.label ? ` ${input.label}` : "";
  const title = input.title ? ` - ${input.title}` : "";

  return `Chapter ${input.number}${suffix}${title}`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { chapterId, slug } = await params;
  const result = await getPublicChapterOrThrow(chapterId, slug);

  if (result.kind === "redirect") {
    return {};
  }

  return buildChapterMetadata(result.chapter);
}

function ChapterNavigation({
  previous,
  next,
  series,
}: {
  previous: {
    id: string;
    slug: string;
    number: string;
    label: string | null;
  } | null;
  next: {
    id: string;
    slug: string;
    number: string;
    label: string | null;
  } | null;
  series: {
    slug: string;
  };
}) {
  return (
    <nav
      aria-label="Chapter navigation"
      className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border/60 py-3 text-sm"
    >
      {previous ? (
        <Link
          href={`/chapter/${previous.id}/${previous.slug}`}
          className="inline-flex min-h-11 items-center text-muted transition hover:text-foreground"
        >
          <span aria-hidden="true" className="mr-2">
            ←
          </span>
          Previous chapter
        </Link>
      ) : null}
      <Link
        href={`/series/${series.slug}`}
        className="inline-flex min-h-11 items-center text-foreground transition hover:text-muted"
      >
        Series
      </Link>
      {next ? (
        <Link
          href={`/chapter/${next.id}/${next.slug}`}
          className="inline-flex min-h-11 items-center text-muted transition hover:text-foreground"
        >
          Next chapter
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </Link>
      ) : null}
    </nav>
  );
}

function ChapterContinuation({
  next,
  series,
}: {
  next: {
    id: string;
    slug: string;
    title: string | null;
    number: string;
    label: string | null;
  } | null;
  series: {
    slug: string;
    title: string;
  };
}) {
  return (
    <section className="mx-auto max-w-3xl space-y-4 border-t border-border/60 pt-8 sm:pt-10">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">
          End of chapter
        </p>
        <h2 className="font-serif text-2xl sm:text-3xl">
          {next
            ? formatChapterLabel({
                number: next.number,
                label: next.label,
                title: next.title,
              })
            : "You reached the latest chapter"}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          {next
            ? "Continue straight into the next published chapter."
            : `There is no newer published chapter yet. You can return to ${series.title} and browse the full chapter list.`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
        {next ? (
          <Link
            href={`/chapter/${next.id}/${next.slug}`}
            className="inline-flex min-h-11 items-center rounded-full bg-foreground px-4 py-2 text-background transition hover:opacity-90"
          >
            Next chapter
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        ) : null}
        <Link
          href={`/series/${series.slug}`}
          className="inline-flex min-h-11 items-center text-muted transition hover:text-foreground"
        >
          Back to series
        </Link>
      </div>
    </section>
  );
}

export default async function ChapterPage({ params }: PageProps) {
  const { chapterId, slug } = await params;
  const [result, session] = await Promise.all([
    getPublicChapterOrThrow(chapterId, slug),
    getOptionalSession(),
  ]);

  if (result.kind === "redirect") {
    redirect(`/chapter/${result.chapterId}/${result.slug}`);
  }

  const currentUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          readingModePreference: true,
        },
      })
    : null;

  const defaultMode =
    currentUser?.readingModePreference ?? ReadingMode.WEBTOON;

  return (
    <main className="shell space-y-8 py-8 sm:space-y-10 sm:py-10">
      <header className="space-y-2 sm:space-y-3">
        <Link
          href={`/series/${result.chapter.series.slug}`}
          className="text-xs uppercase tracking-[0.24em] text-muted"
        >
          {result.chapter.series.title}
        </Link>
        <h1 className="font-serif text-3xl sm:text-4xl">
          Chapter {result.chapter.number}
          {result.chapter.label ? ` ${result.chapter.label}` : ""}
        </h1>
        {result.chapter.title ? (
          <p className="max-w-2xl text-sm leading-6 text-muted">
            {result.chapter.title}
          </p>
        ) : null}
      </header>

      <ChapterNavigation
        previous={result.chapter.navigation.previous}
        next={result.chapter.navigation.next}
        series={result.chapter.series}
      />

      <ChapterReader
        chapterId={result.chapter.id}
        defaultMode={defaultMode}
        enableProgressTracking
        persistToAccount={Boolean(session?.user?.id)}
        pages={result.chapter.pages}
        onPersistReadingMode={
          session?.user?.id ? saveReadingModePreferenceAction : undefined
        }
      />

      <ChapterContinuation
        next={result.chapter.navigation.next}
        series={result.chapter.series}
      />

      <ChapterNavigation
        previous={result.chapter.navigation.previous}
        next={result.chapter.navigation.next}
        series={result.chapter.series}
      />
    </main>
  );
}
