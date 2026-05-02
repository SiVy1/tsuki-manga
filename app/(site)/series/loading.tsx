export default function SeriesCatalogLoading() {
  return (
    <main className="shell space-y-8 py-14">
      <header className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-12 w-64 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </header>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[3/4] w-full animate-pulse rounded-[1.8rem] bg-black/5 dark:bg-white/5" />
            <div className="space-y-1.5 px-1">
              <div className="h-4 w-3/4 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-black/5 dark:bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
