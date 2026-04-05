import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicSeriesCard } from "@/app/_components/public-series-card";
import { getOptionalSession } from "@/app/_lib/auth/session";
import { getLibraryPageData } from "@/app/_lib/reader/queries";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await getOptionalSession();

  if (!session?.user) {
    redirect("/sign-in?redirectTo=%2Flibrary");
  }

  const series = await getLibraryPageData(session.user.id);

  return (
    <main className="shell space-y-8 py-14">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Library</p>
        <h1 className="font-serif text-5xl">Saved series</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted">
          Saved series for quick return.
        </p>
      </header>

      {series.length ? (
        <section className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-5">
          {series.map((entry) => (
            <PublicSeriesCard key={entry.id} series={entry} />
          ))}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="space-y-1">
            <p className="font-serif text-2xl">Nothing saved yet</p>
            <p className="text-sm text-muted">
              Save a series to keep it close and come back to it later.
            </p>
          </div>
          <Link
            href="/series"
            className="inline-flex items-center rounded-full border border-border px-4 py-3 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
          >
            Browse series
          </Link>
        </section>
      )}
    </main>
  );
}
