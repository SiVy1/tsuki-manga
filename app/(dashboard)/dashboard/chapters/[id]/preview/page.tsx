import Link from "next/link";

import { ChapterStatus, ReadingMode } from "@/generated/prisma/client";

import { saveReadingModePreferenceAction } from "@/app/_actions/preferences/actions";
import { ChapterReader } from "@/app/_components/chapter-reader";
import { requirePermission } from "@/app/_lib/auth/session";
import { prisma } from "@/app/_lib/db/client";
import { getDashboardChapterPreviewData } from "@/app/_lib/dashboard/queries";
import { PermissionBits } from "@/app/_lib/permissions/bits";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DashboardChapterPreviewPage({ params }: PageProps) {
  const user = await requirePermission(PermissionBits.CHAPTERS);

  const [{ id }, data] = await Promise.all([
    params,
    params.then(({ id: chapterId }) => getDashboardChapterPreviewData(chapterId)),
  ]);

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      readingModePreference: true,
    },
  });

  const defaultMode = currentUser?.readingModePreference ?? ReadingMode.WEBTOON;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Draft preview</p>
          <Link
            href={`/dashboard/chapters/${id}`}
            className="text-xs uppercase tracking-[0.18em] text-muted transition hover:text-foreground"
          >
            Back to editor
          </Link>
          <h1 className="font-serif text-4xl">
            Chapter {data.chapter.number}
            {data.chapter.label ? ` ${data.chapter.label}` : ""}
          </h1>
          <p className="text-sm text-muted">
            {data.chapter.series.title}
            {data.chapter.title ? ` - ${data.chapter.title}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/dashboard/chapters/${id}`}
            className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
          >
            Return to chapter
          </Link>
          {data.chapter.status === ChapterStatus.PUBLISHED ? (
            <Link
              href={`/chapter/${data.chapter.id}/${data.chapter.slug}`}
              className="rounded-full border border-border px-4 py-2 text-muted transition hover:border-foreground/20 hover:text-foreground"
            >
              Open public reader
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-surface px-5 py-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {data.chapter.status === ChapterStatus.PUBLISHED
              ? "Published preview"
              : "Draft preview"}
          </p>
          <p className="text-sm text-muted">
            This view uses the current chapter pages and reading mode controls.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">
          {data.chapter.pages.length} page{data.chapter.pages.length === 1 ? "" : "s"}
        </p>
      </div>

      <ChapterReader
        defaultMode={defaultMode}
        persistToAccount
        pages={data.chapter.pages}
        onPersistReadingMode={saveReadingModePreferenceAction}
      />
    </div>
  );
}
