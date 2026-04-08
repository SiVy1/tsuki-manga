"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import {
  resolveLatestReadingProgressSnapshot,
  subscribeToReadingProgressStore,
} from "@/app/_lib/reader/client";

export function HomeContinueReading() {
  const t = useTranslations("ContinueReading");
  const common = useTranslations("Common.actions");
  const progress = useSyncExternalStore(
    subscribeToReadingProgressStore,
    resolveLatestReadingProgressSnapshot,
    () => null,
  );

  if (!progress) {
    return null;
  }

  return (
    <section className="shell space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">
          {t("eyebrow")}
        </p>
        <h2 className="font-serif text-2xl md:text-3xl">{progress.seriesTitle}</h2>
      </div>

      <div className="flex items-center gap-4 rounded-[1.6rem] bg-surface/70 p-4 sm:gap-5 sm:p-5">
        <Link
          href={`/chapter/${progress.chapterId}/${progress.chapterSlug}`}
          className="shrink-0"
        >
          {progress.coverUrl ? (
            <Image
              src={progress.coverUrl}
              alt={progress.seriesTitle}
              width={144}
              height={192}
              sizes="144px"
              className="aspect-[3/4] h-auto w-24 rounded-[1.2rem] object-cover sm:w-28"
            />
          ) : (
            <div className="flex aspect-[3/4] w-24 items-center justify-center rounded-[1.2rem] bg-[var(--cover-fallback)] font-serif text-sm text-muted sm:w-28">
              {progress.seriesTitle}
            </div>
          )}
        </Link>

        <div className="min-w-0 space-y-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              {t("chapterLabel", {
                number: progress.chapterNumber,
                label: progress.chapterLabel ? ` ${progress.chapterLabel}` : "",
              })}
            </p>
            <p className="font-serif text-2xl leading-tight">
              {progress.chapterTitle ?? t("fallbackTitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              href={`/chapter/${progress.chapterId}/${progress.chapterSlug}`}
              className="inline-flex min-h-11 items-center rounded-full bg-foreground px-4 py-2 text-background transition hover:opacity-90"
            >
              {common("continueReading")}
            </Link>
            <Link
              href={`/series/${progress.seriesSlug}`}
              className="inline-flex min-h-11 items-center text-muted transition hover:text-foreground"
            >
              {common("openSeries")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
