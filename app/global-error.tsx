"use client";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-background text-foreground">
        <main className="shell py-20">
          <section className="panel space-y-4 p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">
              Critical error
            </p>
            <h1 className="font-serif text-4xl">Something went wrong.</h1>
            <p className="text-sm text-muted">{error.message}</p>
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
