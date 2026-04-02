import Link from "next/link";

import { requirePermission } from "@/app/_lib/auth/session";
import { getDashboardChapterListData } from "@/app/_lib/dashboard/queries";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { formatDateTime, humanizeEnumValue } from "@/app/_lib/utils/formatting";

export default async function DashboardChaptersPage() {
  await requirePermission(PermissionBits.CHAPTERS);
  const chapters = await getDashboardChapterListData();

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Chapters</p>
        <h1 className="font-serif text-4xl">Chapters</h1>
      </section>

      <section className="panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-5 py-4 text-xs uppercase tracking-[0.16em] text-muted md:grid-cols-[minmax(0,1.6fr)_180px_120px_120px_170px]">
          <span>Chapter</span>
          <span>Series</span>
          <span>Status</span>
          <span>Pages</span>
          <span>Updated</span>
        </div>

        <div className="divide-y divide-border">
          {chapters.length ? (
            chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/dashboard/chapters/${chapter.id}`}
                className="grid gap-4 px-5 py-4 transition hover:bg-black/2 md:grid-cols-[minmax(0,1.6fr)_180px_120px_120px_170px]"
              >
                <div className="space-y-1">
                  <h2 className="font-medium">
                    Chapter {chapter.number}
                    {chapter.label ? ` ${chapter.label}` : ""}
                  </h2>
                  {chapter.title ? (
                    <p className="text-sm text-muted">{chapter.title}</p>
                  ) : (
                    <p className="text-sm text-muted">Untitled draft</p>
                  )}
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    /chapter/{chapter.id}/{chapter.slug}
                  </p>
                </div>
                <div className="text-sm text-muted">{chapter.series.title}</div>
                <div className="flex items-start">
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] ${
                      chapter.status === "PUBLISHED"
                        ? "status-success"
                        : "status-warning"
                    }`}
                  >
                    {humanizeEnumValue(chapter.status)}
                  </span>
                </div>
                <div className="text-sm text-muted">{chapter.pageCount}</div>
                <div className="text-sm text-muted">{formatDateTime(chapter.updatedAt)}</div>
              </Link>
            ))
          ) : (
            <div className="space-y-3 px-5 py-10">
              <p className="text-sm text-muted">
                No chapters exist yet. Create a series first, then open its detail page to start
                the first draft.
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
