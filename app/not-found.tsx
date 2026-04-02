export default function NotFoundPage() {
  return (
    <main className="shell py-20">
      <section className="panel space-y-4 p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">404</p>
        <h1 className="font-serif text-4xl">Not found</h1>
        <p className="text-sm text-muted">
          The requested route or resource does not exist.
        </p>
      </section>
    </main>
  );
}
