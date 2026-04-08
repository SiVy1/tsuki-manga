export type ReaderMode = "WEBTOON" | "VERTICAL" | "RIGHT_TO_LEFT";

export type ReaderPage = {
  id: string;
  imageUrl: string | null;
  width: number;
  height: number;
  pageOrder: number;
};

export type StoredReadingProgress = {
  chapterId: string;
  pageId: string;
  pageOrder: number;
  completed: boolean;
  updatedAt: number;
  chapterSlug?: string;
  chapterNumber?: string;
  chapterLabel?: string | null;
  chapterTitle?: string | null;
  seriesTitle?: string;
  seriesSlug?: string;
  coverUrl?: string | null;
};

export type ResolvedResumeProgress = {
  pageId: string;
  pageOrder: number;
  visiblePageNumber: number;
};

export type ReadingProgressContext = {
  chapterSlug: string;
  chapterNumber: string;
  chapterLabel?: string | null;
  chapterTitle?: string | null;
  seriesTitle: string;
  seriesSlug: string;
  coverUrl?: string | null;
};

export type HomeContinueReadingSnapshot = {
  chapterId: string;
  chapterSlug: string;
  chapterNumber: string;
  chapterLabel: string | null;
  chapterTitle: string | null;
  seriesTitle: string;
  seriesSlug: string;
  coverUrl: string | null;
  updatedAt: number;
};

export const readingModes = [
  "WEBTOON",
  "VERTICAL",
  "RIGHT_TO_LEFT",
] as const satisfies ReadonlyArray<ReaderMode>;

export const readerModeValues = [
  "WEBTOON",
  "VERTICAL",
  "RIGHT_TO_LEFT",
] as const satisfies ReadonlyArray<ReaderMode>;

export const readingModeStorageKey = "tsuki-reader-mode";
export const readingProgressStoragePrefix = "tsuki-reader-progress:";
export const readingProgressChangedEvent = "tsuki-reader-progress-changed";

let cachedLatestReadingProgressFingerprint: string | null = null;
let cachedLatestReadingProgressSnapshot: HomeContinueReadingSnapshot | null = null;

export function getPageList(mode: ReaderMode, pages: ReaderPage[]) {
  if (mode === "RIGHT_TO_LEFT") {
    return [...pages].reverse();
  }

  return pages;
}

export function getReadingProgressStorageKey(chapterId: string) {
  return `${readingProgressStoragePrefix}${chapterId}`;
}

export function createStoredReadingProgress(
  chapterId: string,
  page: Pick<ReaderPage, "id" | "pageOrder">,
  completed: boolean,
  context?: ReadingProgressContext,
): StoredReadingProgress {
  return {
    chapterId,
    pageId: page.id,
    pageOrder: page.pageOrder,
    completed,
    updatedAt: Date.now(),
    chapterSlug: context?.chapterSlug,
    chapterNumber: context?.chapterNumber,
    chapterLabel: context?.chapterLabel ?? null,
    chapterTitle: context?.chapterTitle ?? null,
    seriesTitle: context?.seriesTitle,
    seriesSlug: context?.seriesSlug,
    coverUrl: context?.coverUrl ?? null,
  };
}

export function parseStoredReadingProgress(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredReadingProgress>;

    if (
      typeof parsed.chapterId !== "string" ||
      typeof parsed.pageId !== "string" ||
      typeof parsed.pageOrder !== "number" ||
      !Number.isFinite(parsed.pageOrder) ||
      typeof parsed.completed !== "boolean" ||
      typeof parsed.updatedAt !== "number" ||
      !Number.isFinite(parsed.updatedAt)
    ) {
      return null;
    }

    return parsed as StoredReadingProgress;
  } catch {
    return null;
  }
}

export function subscribeToReadingProgressStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event?: StorageEvent) => {
    if (
      !event ||
      event.key === null ||
      event.key.startsWith(readingProgressStoragePrefix)
    ) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(readingProgressChangedEvent, handleStorage as EventListener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(readingProgressChangedEvent, handleStorage as EventListener);
  };
}

export function notifyReadingProgressStoreChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(readingProgressChangedEvent));
}

export function resolveLatestReadingProgressSnapshot(): HomeContinueReadingSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const relevantEntries: string[] = [];
  let latestMatch: HomeContinueReadingSnapshot | null = null;

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith(readingProgressStoragePrefix)) {
      continue;
    }

    const rawValue = window.localStorage.getItem(key);

    relevantEntries.push(`${key}:${rawValue ?? ""}`);

    const parsed = parseStoredReadingProgress(rawValue);

    if (
      !parsed ||
      parsed.completed ||
      !parsed.chapterSlug ||
      !parsed.chapterNumber ||
      !parsed.seriesTitle ||
      !parsed.seriesSlug
    ) {
      continue;
    }

    const snapshot: HomeContinueReadingSnapshot = {
      chapterId: parsed.chapterId,
      chapterSlug: parsed.chapterSlug,
      chapterNumber: parsed.chapterNumber,
      chapterLabel: parsed.chapterLabel ?? null,
      chapterTitle: parsed.chapterTitle ?? null,
      seriesTitle: parsed.seriesTitle,
      seriesSlug: parsed.seriesSlug,
      coverUrl: parsed.coverUrl ?? null,
      updatedAt: parsed.updatedAt,
    };

    if (!latestMatch || snapshot.updatedAt > latestMatch.updatedAt) {
      latestMatch = snapshot;
    }
  }

  relevantEntries.sort((left, right) => left.localeCompare(right));
  const fingerprint = relevantEntries.join("|");

  if (fingerprint === cachedLatestReadingProgressFingerprint) {
    return cachedLatestReadingProgressSnapshot;
  }

  cachedLatestReadingProgressFingerprint = fingerprint;
  cachedLatestReadingProgressSnapshot = latestMatch;

  return latestMatch;
}

export function resolveResumeProgress(
  chapterId: string,
  visiblePages: Pick<ReaderPage, "id" | "pageOrder">[],
  rawValue: string | null,
): ResolvedResumeProgress | null {
  const parsed = parseStoredReadingProgress(rawValue);

  if (!parsed || parsed.chapterId !== chapterId || parsed.completed) {
    return null;
  }

  const pageIndex = visiblePages.findIndex((page) => page.id === parsed.pageId);

  if (pageIndex <= 0 || pageIndex === visiblePages.length - 1) {
    return null;
  }

  return {
    pageId: parsed.pageId,
    pageOrder: parsed.pageOrder,
    visiblePageNumber: pageIndex + 1,
  };
}
