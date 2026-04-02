"use client";

import { useSyncExternalStore, useTransition } from "react";

type ReaderPage = {
  id: string;
  imageUrl: string | null;
  width: number;
  height: number;
  pageOrder: number;
};

type ReaderMode = "WEBTOON" | "VERTICAL" | "RIGHT_TO_LEFT";

type ChapterReaderProps = {
  defaultMode: ReaderMode;
  persistToAccount: boolean;
  pages: ReaderPage[];
  onPersistReadingMode?: (input: { readingMode: ReaderMode }) => Promise<unknown>;
};

const readingModes = [
  { id: "WEBTOON", label: "Webtoon" },
  { id: "VERTICAL", label: "Vertical" },
  { id: "RIGHT_TO_LEFT", label: "Right to left" },
] as const satisfies ReadonlyArray<{ id: ReaderMode; label: string }>;

const readerModeValues = [
  "WEBTOON",
  "VERTICAL",
  "RIGHT_TO_LEFT",
];

const readingModeStorageKey = "tsuki-reader-mode";
const readingModeListeners = new Set<() => void>();

function subscribeToReadingMode(listener: () => void) {
  readingModeListeners.add(listener);

  return () => {
    readingModeListeners.delete(listener);
  };
}

function getStoredReadingMode(defaultMode: ReaderMode) {
  if (typeof window === "undefined") {
    return defaultMode;
  }

  const storedMode = window.localStorage.getItem(readingModeStorageKey);

  if (
    storedMode &&
    readerModeValues.includes(storedMode as ReaderMode)
  ) {
    return storedMode as ReaderMode;
  }

  return defaultMode;
}

function saveStoredReadingMode(readingMode: ReaderMode) {
  window.localStorage.setItem(readingModeStorageKey, readingMode);
  readingModeListeners.forEach((listener) => listener());
}

function getPageList(mode: ReaderMode, pages: ReaderPage[]) {
  if (mode === "RIGHT_TO_LEFT") {
    return [...pages].reverse();
  }

  return pages;
}

export function ChapterReader({
  defaultMode,
  persistToAccount,
  pages,
  onPersistReadingMode,
}: ChapterReaderProps) {
  const readingMode = useSyncExternalStore(
    subscribeToReadingMode,
    () => getStoredReadingMode(defaultMode),
    () => defaultMode,
  );
  const [isPending, startTransition] = useTransition();

  const visiblePages = getPageList(readingMode, pages);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {readingModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => {
              saveStoredReadingMode(mode.id);

              if (persistToAccount && onPersistReadingMode) {
                startTransition(async () => {
                  await onPersistReadingMode({
                    readingMode: mode.id,
                  });
                });
              }
            }}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              readingMode === mode.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {mode.label}
          </button>
        ))}
        <span className="text-xs uppercase tracking-[0.16em] text-muted">
          {isPending ? "Saving preference" : "Reader mode"}
        </span>
      </div>

      <div
        className={`mx-auto ${
          readingMode === "WEBTOON"
            ? "max-w-3xl space-y-0"
            : "max-w-5xl space-y-6"
        }`}
      >
        {visiblePages.map((page) =>
          page.imageUrl ? (
            <article
              key={page.id}
              className={`overflow-hidden ${
                readingMode === "WEBTOON"
                  ? "rounded-none border-0 bg-transparent p-0"
                  : "rounded-[1.5rem] border border-border bg-surface p-3"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.imageUrl}
                alt=""
                width={page.width || undefined}
                height={page.height || undefined}
                className="mx-auto h-auto w-full"
              />
            </article>
          ) : null,
        )}
      </div>
    </div>
  );
}
