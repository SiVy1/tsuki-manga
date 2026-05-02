export default function ChapterLoading() {
  return (
    <main className="shell space-y-6 py-6 sm:space-y-10 sm:py-10">
      <header className="space-y-1.5 sm:space-y-3">
        <div className="h-3 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-10 w-64 animate-pulse rounded bg-black/10 dark:bg-white/10 sm:h-12" />
        <div className="h-5 w-48 animate-pulse rounded bg-black/5 dark:bg-white/5" />
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-border/60 py-2.5 sm:gap-x-5 sm:gap-y-2 sm:py-3">
        <div className="h-11 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        <div className="h-11 w-20 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        <div className="h-11 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5" />
      </div>

      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 rounded-xl bg-black/2 dark:bg-white/2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>

      <div className="mx-auto max-w-3xl space-y-4 border-t border-border/60 pt-10 sm:space-y-5 sm:pt-12">
        <div className="space-y-2.5 sm:space-y-3">
          <div className="h-3 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-8 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-5 w-64 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="h-11 w-32 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-11 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        </div>
      </div>
    </main>
  );
}
