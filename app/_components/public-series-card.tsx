import Image from "next/image";
import Link from "next/link";

export type PublicSeriesCardData = {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  latestChapter: {
    id: string;
    slug: string;
    number: string;
    label: string | null;
  } | null;
};

type PublicSeriesCardProps = {
  series: PublicSeriesCardData;
};

export function PublicSeriesCard({ series }: PublicSeriesCardProps) {
  return (
    <Link href={`/series/${series.slug}`} className="space-y-3">
      {series.coverUrl ? (
        <Image
          src={series.coverUrl}
          alt={series.title}
          width={320}
          height={426}
          sizes="(max-width: 768px) 45vw, (max-width: 1200px) 30vw, 18vw"
          className="aspect-[3/4] h-auto w-full rounded-[1.6rem] object-cover transition duration-300 hover:scale-[1.02]"
        />
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center rounded-[1.6rem] bg-[var(--cover-fallback)] font-serif text-sm text-muted">
          {series.title}
        </div>
      )}
      <div className="space-y-1">
        <h2 className="font-serif text-2xl leading-tight">{series.title}</h2>
        {series.latestChapter ? (
          <p className="text-xs uppercase tracking-[0.14em] text-muted">
            Chapter {series.latestChapter.number}
            {series.latestChapter.label ? ` ${series.latestChapter.label}` : ""}
          </p>
        ) : (
          <p className="text-xs uppercase tracking-[0.14em] text-muted">No chapters</p>
        )}
      </div>
    </Link>
  );
}
