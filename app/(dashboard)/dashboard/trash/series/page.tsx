import Link from "next/link";
import { redirect } from "next/navigation";

import { restoreSeriesAction } from "@/app/_actions/series/actions";
import { requireAdmin } from "@/app/_lib/auth/session";
import { getDeletedSeriesData } from "@/app/_lib/dashboard/queries";
import { formatDateTime } from "@/app/_lib/utils/formatting";
import { SubmitButton } from "@/app/_components/submit-button";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function DashboardTrashSeriesPage({
  searchParams,
}: PageProps) {
  const [params, deletedSeries] = await Promise.all([
    searchParams,
    requireAdmin().then(() => getDeletedSeriesData()),
  ]);

  async function restoreSeriesFormAction(formData: FormData) {
    "use server";

    const result = await restoreSeriesAction({
      id: formData.get("id")?.toString() ?? "",
    });

    if (!result.success) {
      redirect(`/dashboard/trash/series?error=${encodeURIComponent(result.error)}`);
    }

    redirect(`/dashboard/trash/series?notice=${encodeURIComponent("Series restored.")}`);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Trash</p>
          <h1 className="font-serif text-4xl">Series trash</h1>
        </div>
        <Link
          href="/dashboard/trash/chapters"
          className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
        >
          Chapter trash
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
          {deletedSeries.length ? (
            deletedSeries.map((series) => (
              <div
                key={series.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-border p-4"
              >
                <div className="space-y-1">
                  <h2 className="font-medium">{series.title}</h2>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    /series/{series.slug}
                  </p>
                  <p className="text-sm text-muted">
                    Deleted {formatDateTime(series.deletedAt)}
                  </p>
                </div>
                <form action={restoreSeriesFormAction}>
                  <input type="hidden" name="id" value={series.id} />
                  <SubmitButton pendingLabel="Restoring...">Restore</SubmitButton>
                </form>
              </div>
            ))
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">No deleted series are waiting in the trash.</p>
              <Link href="/dashboard/series" className="text-sm underline">
                Back to series
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
