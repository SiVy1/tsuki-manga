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
}: {
  previous: { id: string; slug: string } | null;
  next: { id: string; slug: string } | null;
}) {
  return (
    <nav className="flex flex-wrap gap-3 text-sm">
      {previous ? (
        <Link
          href={`/chapter/${previous.id}/${previous.slug}`}
          className="rounded-full border border-border px-4 py-2"
        >
          Previous
        </Link>
      ) : null}
      {next ? (
        <Link
          href={`/chapter/${next.id}/${next.slug}`}
          className="rounded-full border border-border px-4 py-2"
        >
          Next
        </Link>
      ) : null}
    </nav>
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
    <main className="shell space-y-8 py-10">
      <header className="space-y-2">
        <Link
          href={`/series/${result.chapter.series.slug}`}
          className="text-xs uppercase tracking-[0.24em] text-muted"
        >
          {result.chapter.series.title}
        </Link>
        <h1 className="font-serif text-4xl">
          Chapter {result.chapter.number}
          {result.chapter.label ? ` ${result.chapter.label}` : ""}
        </h1>
        {result.chapter.title ? (
          <p className="text-sm text-muted">{result.chapter.title}</p>
        ) : null}
      </header>

      <ChapterNavigation
        previous={result.chapter.navigation.previous}
        next={result.chapter.navigation.next}
      />

      <ChapterReader
        defaultMode={defaultMode}
        persistToAccount={Boolean(session?.user?.id)}
        pages={result.chapter.pages}
        onPersistReadingMode={
          session?.user?.id ? saveReadingModePreferenceAction : undefined
        }
      />

      <ChapterNavigation
        previous={result.chapter.navigation.previous}
        next={result.chapter.navigation.next}
      />
    </main>
  );
}
