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
};

export type ResolvedResumeProgress = {
  pageId: string;
  pageOrder: number;
  visiblePageNumber: number;
};

export const readingModes = [
  { id: "WEBTOON", label: "Webtoon" },
  { id: "VERTICAL", label: "Left to right" },
  { id: "RIGHT_TO_LEFT", label: "Right to left" },
] as const satisfies ReadonlyArray<{ id: ReaderMode; label: string }>;

export const readerModeValues = [
  "WEBTOON",
  "VERTICAL",
  "RIGHT_TO_LEFT",
] as const satisfies ReadonlyArray<ReaderMode>;

export const readingModeStorageKey = "tsuki-reader-mode";
export const readingProgressStoragePrefix = "tsuki-reader-progress:";

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
): StoredReadingProgress {
  return {
    chapterId,
    pageId: page.id,
    pageOrder: page.pageOrder,
    completed,
    updatedAt: Date.now(),
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
