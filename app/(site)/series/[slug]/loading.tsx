export default function SeriesLoading() {
  return (
    <main className="shell space-y-12 py-10 sm:space-y-14 sm:py-12 lg:py-14">
      <section className="grid gap-7 sm:gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <div className="aspect-[3/4] w-full animate-pulse rounded-[1.8rem] bg-black/5 dark:bg-white/5" />

        <div className="space-y-5 sm:space-y-6">
          <div className="space-y-3 sm:space-y-3.5">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="h-3 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-12 w-3/4 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-black/5 dark:bg-white/5" />
              <div className="h-4 w-full max-w-xl animate-pulse rounded bg-black/5 dark:bg-white/5" />
              <div className="h-4 w-3/4 max-w-lg animate-pulse rounded bg-black/5 dark:bg-white/5" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 animate-pulse rounded-full border border-border bg-black/5 dark:bg-white/5"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="h-8 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="panel divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
                <div className="h-3 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
