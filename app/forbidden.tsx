import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="shell py-20">
      <section className="panel space-y-4 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">403</p>
        <h1 className="font-serif text-4xl">Forbidden</h1>
        <p className="text-sm text-muted">
          Your account is signed in, but it does not have the required
          permission for this resource.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/"
            className="rounded-full bg-foreground px-4 py-2 text-background"
          >
            Return home
          </Link>
          <Link
            href="/series"
            className="rounded-full border border-border px-4 py-2 text-muted"
          >
            Browse series
          </Link>
        </div>
      </section>
    </main>
  );
}
