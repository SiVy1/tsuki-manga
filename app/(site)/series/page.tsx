import { SeriesCatalogBrowser } from "@/app/_components/series-catalog-browser";
import { getSeriesCatalogData } from "@/app/_lib/reader/queries";

export const dynamic = "force-dynamic";

export default async function SeriesCatalogPage() {
  const data = await getSeriesCatalogData();

  return (
    <main className="shell space-y-8 py-14">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Series</p>
        <h1 className="font-serif text-5xl">Catalog</h1>
      </header>

      <SeriesCatalogBrowser series={data.series} />
    </main>
  );
}
