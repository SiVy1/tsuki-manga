import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="shell py-20">
      <section className="panel space-y-4 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">401</p>
        <h1 className="font-serif text-4xl">Unauthorized</h1>
        <p className="text-sm text-muted">
          Sign in is required before entering the protected parts of the app.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/sign-in"
            className="rounded-full bg-foreground px-4 py-2 text-background"
          >
            Go to sign in
          </Link>
          <Link
            href="/"
            className="rounded-full border border-border px-4 py-2 text-muted"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
