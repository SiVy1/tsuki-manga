export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="h-4 w-64 animate-pulse rounded bg-black/5 dark:bg-white/5" />
        </div>
      </header>
      <div className="panel divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-4 w-24 animate-pulse rounded bg-black/5 dark:bg-white/5" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-full bg-black/5 dark:bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
