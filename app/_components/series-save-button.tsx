"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, useTransition } from "react";

import {
  removeSavedSeriesAction,
  saveSeriesAction,
} from "@/app/_actions/library/actions";
import {
  notifySavedSeriesChanged,
  resolveSavedSeriesSnapshot,
  savedSeriesStorageKey,
  subscribeToSavedSeries,
  toggleSavedSeriesIds,
} from "@/app/_lib/library/client";

type SeriesSaveButtonProps = {
  seriesId: string;
  initialSaved: boolean;
  signedIn: boolean;
};

export function SeriesSaveButton({
  seriesId,
  initialSaved,
  signedIn,
}: SeriesSaveButtonProps) {
  const t = useTranslations("SeriesSave");
  const [serverSaved, setServerSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();
  const anonymousSaved = useSyncExternalStore(
    subscribeToSavedSeries,
    () => resolveSavedSeriesSnapshot(seriesId),
    () => false,
  );
  const saved = signedIn ? serverSaved : anonymousSaved;

  const handleAnonymousToggle = () => {
    const next = toggleSavedSeriesIds(
      seriesId,
      window.localStorage.getItem(savedSeriesStorageKey),
    );

    window.localStorage.setItem(savedSeriesStorageKey, next.value);
    notifySavedSeriesChanged();
  };

  const handleSignedInToggle = () => {
    startTransition(async () => {
      const result = saved
        ? await removeSavedSeriesAction({ seriesId })
        : await saveSeriesAction({ seriesId });

      if (result.success) {
        setServerSaved(result.data.saved);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={signedIn ? handleSignedInToggle : handleAnonymousToggle}
      className={`inline-flex min-h-11 items-center gap-2 rounded-md px-1 py-2 text-sm transition ${
        saved
          ? "text-foreground"
          : "text-muted hover:text-foreground"
      }`}
      aria-pressed={saved}
      disabled={isPending}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className={`h-4 w-4 shrink-0 transition ${
          saved ? "fill-current text-foreground" : "fill-none text-current"
        }`}
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 2.5h8a1 1 0 0 1 1 1V14l-5-2.9L3 14V3.5a1 1 0 0 1 1-1Z" />
      </svg>
      {saved ? t("saved") : t("saveSeries")}
    </button>
  );
}
