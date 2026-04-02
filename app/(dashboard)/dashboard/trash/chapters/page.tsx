import Link from "next/link";
import { redirect } from "next/navigation";

import { restoreChapterAction } from "@/app/_actions/chapters/actions";
import { requireAdmin } from "@/app/_lib/auth/session";
import { getDeletedChaptersData } from "@/app/_lib/dashboard/queries";
import { formatDateTime } from "@/app/_lib/utils/formatting";
import { SubmitButton } from "@/app/_components/submit-button";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function DashboardTrashChaptersPage({
  searchParams,
}: PageProps) {
  const [params, deletedChapters] = await Promise.all([
    searchParams,
    requireAdmin().then(() => getDeletedChaptersData()),
  ]);

  async function restoreChapterFormAction(formData: FormData) {
    "use server";

    const result = await restoreChapterAction({
      chapterId: formData.get("chapterId")?.toString() ?? "",
      restoreSeries: formData.get("restoreSeries")?.toString() === "true",
    });

    if (!result.success) {
      redirect(`/dashboard/trash/chapters?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/trash/chapters?notice=${encodeURIComponent("Chapter restored.")}`);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Trash</p>
          <h1 className="font-serif text-4xl">Chapter trash</h1>
        </div>
        <Link
          href="/dashboard/trash/series"
          className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
        >
          Series trash
        </Link>
      </section>

      {params.notice ? (
        <p className="notice-success rounded-2xl px-4 py-3 text-sm">
          {params.notice}
        </p>
      ) : null}

      {params.error ? (
        <p className="notice-warning rounded-2xl px-4 py-3 text-sm">
          {params.error}
        </p>
      ) : null}

      <section className="panel p-6">
        <div className="space-y-4">
          {deletedChapters.length ? (
            deletedChapters.map((chapter) => (
              <div
                key={chapter.id}
                className="space-y-4 rounded-[1.5rem] border border-border p-4"
              >
                <div className="space-y-1">
                  <h2 className="font-medium">
                    {chapter.series.title} - {chapter.number}
                    {chapter.label ? ` ${chapter.label}` : ""}
                  </h2>
                  {chapter.title ? (
                    <p className="text-sm text-muted">{chapter.title}</p>
                  ) : null}
                  <p className="text-sm text-muted">
                    Deleted {formatDateTime(chapter.deletedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <form action={restoreChapterFormAction}>
                    <input type="hidden" name="chapterId" value={chapter.id} />
                    <input type="hidden" name="restoreSeries" value="false" />
                    <SubmitButton pendingLabel="Restoring...">
                      Restore chapter
                    </SubmitButton>
                  </form>

                  {chapter.series.deletedAt ? (
                    <form action={restoreChapterFormAction}>
                      <input type="hidden" name="chapterId" value={chapter.id} />
                      <input type="hidden" name="restoreSeries" value="true" />
                      <SubmitButton
                        pendingLabel="Restoring..."
                        className="rounded-full border border-foreground px-4 py-2.5 text-sm text-foreground transition hover:bg-foreground hover:text-background disabled:cursor-wait disabled:opacity-70"
                      >
                        Restore with series
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">No deleted chapters are waiting in the trash.</p>
              <Link href="/dashboard/chapters" className="text-sm underline">
                Back to chapters
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
