"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import {
  createStoredReadingProgress,
  getPageList,
  getReadingProgressStorageKey,
  notifyReadingProgressStoreChanged,
  readingModeStorageKey,
  readerModeValues,
  resolveResumeProgress,
  type ReaderMode,
  type ReaderPage,
} from "@/app/_lib/reader/client";

type ChapterReaderProps = {
  chapterId?: string;
  chapterSlug?: string;
  chapterNumber?: string;
  chapterLabel?: string | null;
  chapterTitle?: string | null;
  seriesTitle?: string;
  seriesSlug?: string;
  coverUrl?: string | null;
  defaultMode: ReaderMode;
  enableProgressTracking?: boolean;
  persistToAccount: boolean;
  pages: ReaderPage[];
  onPersistReadingMode?: (input: { readingMode: ReaderMode }) => Promise<unknown>;
};

const readingModeListeners = new Set<() => void>();
const readingProgressListeners = new Set<() => void>();
const rtlFitModeListeners = new Set<() => void>();
const rtlFitModeStorageKey = "tsuki-reader-rtl-fit-mode";

type RtlFitMode = "PAGE" | "WIDTH";

const rtlFitModes = ["PAGE", "WIDTH"] as const satisfies ReadonlyArray<RtlFitMode>;

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

function subscribeToReadingProgress(listener: () => void) {
  readingProgressListeners.add(listener);

  return () => {
    readingProgressListeners.delete(listener);
  };
}

function notifyReadingProgressListeners() {
  readingProgressListeners.forEach((listener) => listener());
}

function subscribeToRtlFitMode(listener: () => void) {
  rtlFitModeListeners.add(listener);

  return () => {
    rtlFitModeListeners.delete(listener);
  };
}

function notifyRtlFitModeListeners() {
  rtlFitModeListeners.forEach((listener) => listener());
}

function getStoredRtlFitMode() {
  if (typeof window === "undefined") {
    return "PAGE" as const;
  }

  const storedValue = window.localStorage.getItem(rtlFitModeStorageKey);
  return storedValue === "WIDTH" ? "WIDTH" : "PAGE";
}

function setStoredRtlFitMode(fitMode: RtlFitMode) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(rtlFitModeStorageKey, fitMode);
  notifyRtlFitModeListeners();
}

export function ChapterReader({
  chapterId,
  chapterSlug,
  chapterNumber,
  chapterLabel,
  chapterTitle,
  seriesTitle,
  seriesSlug,
  coverUrl,
  defaultMode,
  enableProgressTracking = false,
  persistToAccount,
  pages,
  onPersistReadingMode,
}: ChapterReaderProps) {
  const t = useTranslations("Reader");
  const readingMode = useSyncExternalStore(
    subscribeToReadingMode,
    () => getStoredReadingMode(defaultMode),
    () => defaultMode,
  );
  const [isPending, startTransition] = useTransition();
  const [dismissedResumeKey, setDismissedResumeKey] = useState<string | null>(null);
  const [activeVisiblePageId, setActiveVisiblePageId] = useState<string | null>(null);
  const [loadedRtlImageKey, setLoadedRtlImageKey] = useState<string | null>(null);
  const pageRefs = useRef(new Map<string, HTMLElement>());
  const latestSavedPageId = useRef<string | null>(null);
  const rtlPageViewportRef = useRef<HTMLElement | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const ignoreRtlClickRef = useRef(false);

  const visiblePages = getPageList(readingMode, pages);
  const resumeScopeKey = chapterId ? `${chapterId}:${readingMode}` : null;
  const isRightToLeft = readingMode === "RIGHT_TO_LEFT";
  const isWebtoon = readingMode === "WEBTOON";
  const rtlFitMode = useSyncExternalStore(
    subscribeToRtlFitMode,
    getStoredRtlFitMode,
    () => "PAGE" as const,
  );
  const effectiveActiveVisiblePageId =
    activeVisiblePageId ?? (isRightToLeft ? (visiblePages[visiblePages.length - 1]?.id ?? null) : null);
  const currentRtlIndex = isRightToLeft
    ? (() => {
        const foundIndex = visiblePages.findIndex(
          (page) => page.id === effectiveActiveVisiblePageId,
        );

        return foundIndex >= 0 ? foundIndex : Math.max(visiblePages.length - 1, 0);
      })()
    : -1;
  const currentRtlPage =
    isRightToLeft && currentRtlIndex >= 0 ? visiblePages[currentRtlIndex] : null;
  const rtlNextPage =
    isRightToLeft && currentRtlIndex > 0 ? visiblePages[currentRtlIndex - 1] : null;
  const rtlPreviousPage =
    isRightToLeft && currentRtlIndex >= 0 && currentRtlIndex < visiblePages.length - 1
      ? visiblePages[currentRtlIndex + 1]
      : null;

  const storedProgressValue = useSyncExternalStore(
    subscribeToReadingProgress,
    () => {
      if (
        !enableProgressTracking ||
        !chapterId ||
        typeof window === "undefined"
      ) {
        return null;
      }

      return window.localStorage.getItem(getReadingProgressStorageKey(chapterId));
    },
    () => null,
  );

  const resumeProgress =
    !enableProgressTracking ||
    !chapterId ||
    dismissedResumeKey === resumeScopeKey
      ? null
      : resolveResumeProgress(chapterId, visiblePages, storedProgressValue);
  const rtlPageAspectRatio =
    currentRtlPage && currentRtlPage.width > 0 && currentRtlPage.height > 0
      ? `${currentRtlPage.width} / ${currentRtlPage.height}`
      : "5 / 7";
  const currentRtlImageKey =
    currentRtlPage ? `${currentRtlPage.id}:${rtlFitMode}` : null;
  const rtlPageImageLoaded =
    currentRtlImageKey !== null && loadedRtlImageKey === currentRtlImageKey;

  useEffect(() => {
    if (
      !isRightToLeft ||
      !enableProgressTracking ||
      !chapterId ||
      !currentRtlPage ||
      typeof window === "undefined" ||
      resumeProgress
    ) {
      return;
    }

    const storageKey = getReadingProgressStorageKey(chapterId);
    const completed = currentRtlIndex === 0;

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(
        createStoredReadingProgress(chapterId, currentRtlPage, completed, {
          chapterSlug: chapterSlug ?? "",
          chapterNumber: chapterNumber ?? "",
          chapterLabel,
          chapterTitle,
          seriesTitle: seriesTitle ?? "",
          seriesSlug: seriesSlug ?? "",
          coverUrl,
        }),
      ),
    );
    latestSavedPageId.current = currentRtlPage.id;
    notifyReadingProgressListeners();
    notifyReadingProgressStoreChanged();
  }, [
    chapterLabel,
    chapterNumber,
    chapterSlug,
    chapterTitle,
    chapterId,
    coverUrl,
    currentRtlIndex,
    currentRtlPage,
    enableProgressTracking,
    isRightToLeft,
    resumeProgress,
    seriesSlug,
    seriesTitle,
  ]);

  useEffect(() => {
    if (!isRightToLeft || rtlFitMode !== "WIDTH" || !rtlPageViewportRef.current) {
      return;
    }

    rtlPageViewportRef.current.scrollTop = 0;
  }, [currentRtlPage?.id, isRightToLeft, rtlFitMode]);

  useEffect(() => {
    if (
      isRightToLeft ||
      !enableProgressTracking ||
      !chapterId ||
      visiblePages.length === 0 ||
      typeof window === "undefined" ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const storageKey = getReadingProgressStorageKey(chapterId);
    const pageById = new Map(visiblePages.map((page) => [page.id, page]));

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((entryA, entryB) => entryB.intersectionRatio - entryA.intersectionRatio)[0];

        if (!mostVisibleEntry) {
          return;
        }

        const pageId = mostVisibleEntry.target.getAttribute("data-reader-page-id");

        if (!pageId || latestSavedPageId.current === pageId) {
          return;
        }

        const currentPage = pageById.get(pageId);

        if (!currentPage) {
          return;
        }

        setActiveVisiblePageId(currentPage.id);

        const completed =
          visiblePages[visiblePages.length - 1]?.id === currentPage.id;

        window.localStorage.setItem(
          storageKey,
          JSON.stringify(
            createStoredReadingProgress(chapterId, currentPage, completed, {
              chapterSlug: chapterSlug ?? "",
              chapterNumber: chapterNumber ?? "",
              chapterLabel,
              chapterTitle,
              seriesTitle: seriesTitle ?? "",
              seriesSlug: seriesSlug ?? "",
              coverUrl,
            }),
          ),
        );
        latestSavedPageId.current = currentPage.id;
        setDismissedResumeKey(resumeScopeKey);
        notifyReadingProgressListeners();
        notifyReadingProgressStoreChanged();
      },
      {
        threshold: [0.6, 0.85],
      },
    );

    pageRefs.current.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
    };
  }, [
    chapterId,
    chapterLabel,
    chapterNumber,
    chapterSlug,
    chapterTitle,
    coverUrl,
    enableProgressTracking,
    isRightToLeft,
    resumeScopeKey,
    seriesSlug,
    seriesTitle,
    visiblePages,
  ]);

  function setPageRef(pageId: string, element: HTMLElement | null) {
    if (!element) {
      pageRefs.current.delete(pageId);
      return;
    }

    pageRefs.current.set(pageId, element);
  }

  function handleResumeReading() {
    if (!resumeProgress) {
      return;
    }

    if (isRightToLeft) {
      setActiveVisiblePageId(resumeProgress.pageId);
    } else {
      const target = pageRefs.current.get(resumeProgress.pageId);

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }

    setDismissedResumeKey(resumeScopeKey);
  }

  function handleStartFromBeginning() {
    if (!chapterId || typeof window === "undefined") {
      setDismissedResumeKey(resumeScopeKey);
      return;
    }

    window.localStorage.removeItem(getReadingProgressStorageKey(chapterId));
    latestSavedPageId.current = null;
    if (isRightToLeft) {
      setActiveVisiblePageId(visiblePages[visiblePages.length - 1]?.id ?? null);
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
    setDismissedResumeKey(resumeScopeKey);
    notifyReadingProgressListeners();
    notifyReadingProgressStoreChanged();
  }

  function scrollToRtlPage(pageId: string) {
    setActiveVisiblePageId(pageId);
  }

  function goToRtlNextPage() {
    if (rtlNextPage) {
      scrollToRtlPage(rtlNextPage.id);
    }
  }

  function goToRtlPreviousPage() {
    if (rtlPreviousPage) {
      scrollToRtlPage(rtlPreviousPage.id);
    }
  }

  useEffect(() => {
    if (!isRightToLeft || typeof window === "undefined") {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (rtlNextPage) {
          scrollToRtlPage(rtlNextPage.id);
        }
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (rtlPreviousPage) {
          scrollToRtlPage(rtlPreviousPage.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRightToLeft, rtlNextPage, rtlPreviousPage]);

  function handleRtlTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];

    if (!touch) {
      return;
    }

    swipeStartXRef.current = touch.clientX;
    swipeStartYRef.current = touch.clientY;
  }

  function handleRtlTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];

    if (
      !touch ||
      swipeStartXRef.current === null ||
      swipeStartYRef.current === null
    ) {
      swipeStartXRef.current = null;
      swipeStartYRef.current = null;
      return;
    }

    const deltaX = touch.clientX - swipeStartXRef.current;
    const deltaY = touch.clientY - swipeStartYRef.current;

    swipeStartXRef.current = null;
    swipeStartYRef.current = null;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    ignoreRtlClickRef.current = true;

    if (deltaX < 0) {
      goToRtlNextPage();
      return;
    }

    goToRtlPreviousPage();
  }

  function handleRtlPageClick(event: React.MouseEvent<HTMLElement>) {
    if (ignoreRtlClickRef.current) {
      ignoreRtlClickRef.current = false;
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    const leftZone = rect.width * 0.25;
    const rightZone = rect.width * 0.75;

    if (relativeX <= leftZone) {
      goToRtlNextPage();
      return;
    }

    if (relativeX >= rightZone) {
      goToRtlPreviousPage();
    }
  }

  function dismissResumePrompt() {
    if (!resumeProgress || !resumeScopeKey) {
      return;
    }

    setDismissedResumeKey(resumeScopeKey);
  }

  return (
    <div
      className="space-y-5 sm:space-y-6"
      onPointerDownCapture={dismissResumePrompt}
      onWheelCapture={dismissResumePrompt}
      onTouchStartCapture={dismissResumePrompt}
    >
      <div className="space-y-2 sm:space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
              {t("modeLabel")}
            </span>
            <div className="flex flex-wrap gap-2">
              {readerModeValues.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    saveStoredReadingMode(mode);

                    if (persistToAccount && onPersistReadingMode) {
                      startTransition(async () => {
                        await onPersistReadingMode({
                          readingMode: mode,
                        });
                      });
                    }
                  }}
                  className={`rounded-full px-3 py-1.5 text-[13px] transition sm:text-sm ${
                    readingMode === mode
                      ? "bg-foreground text-background"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t(`modes.${mode}`)}
                </button>
              ))}
            </div>
          </div>
          {isPending ? (
            <span className="text-xs text-muted">{t("savePreference")}</span>
          ) : null}
        </div>
      </div>

      {resumeProgress ? (
        <div className="flex flex-wrap items-center gap-2.5 border-b border-t border-border/60 py-2.5 text-[13px] sm:gap-3 sm:py-3 sm:text-sm">
          <p className="text-foreground">
            {t("resumeFromPage", { page: resumeProgress.visiblePageNumber })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleResumeReading}
              className="text-foreground underline decoration-border underline-offset-4 transition hover:decoration-foreground"
            >
              {t("resume")}
            </button>
            <button
              type="button"
              onClick={handleStartFromBeginning}
              className="text-muted transition hover:text-foreground"
            >
              {t("startOver")}
            </button>
          </div>
        </div>
      ) : null}

      {isRightToLeft ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-2.5 sm:pb-3">
          <div className="space-y-1">
            <p className="text-[13px] text-foreground sm:text-sm">
              {t("pageLabel", {
                current: visiblePages.length - currentRtlIndex,
                total: visiblePages.length,
              })}
            </p>
            <p className="text-xs text-muted">
              {t("tapHelp")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
              {t("fitLabel")}
            </span>
            <div className="flex flex-wrap gap-1">
              {rtlFitModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setStoredRtlFitMode(mode);
                  }}
                  className={`rounded-full px-3 py-1.5 transition ${
                    rtlFitMode === mode
                      ? "bg-foreground text-background"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t(mode === "PAGE" ? "fitPage" : "fitWidth")}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isRightToLeft ? (
        <div className="mx-auto flex min-h-[52vh] max-w-5xl items-center justify-center py-1 sm:min-h-[60vh] sm:py-2">
          {currentRtlPage?.imageUrl ? (
            <article
              key={currentRtlPage.id}
              ref={rtlPageViewportRef}
              onClick={handleRtlPageClick}
              onTouchStart={handleRtlTouchStart}
              onTouchEnd={handleRtlTouchEnd}
              className={`relative flex w-full overflow-hidden ${
                rtlFitMode === "WIDTH"
                  ? "max-h-[calc(100vh-14rem)] max-w-[min(92vw,56rem)] items-start justify-center overflow-y-auto"
                  : "max-w-[min(84vw,42rem)] items-center justify-center"
              }`}
            >
              {!rtlPageImageLoaded ? (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    aspectRatio: rtlPageAspectRatio,
                  }}
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-muted">
                      {t("loadingPage")}
                    </div>
                  </div>
                ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={currentRtlImageKey ?? currentRtlPage.id}
                src={currentRtlPage.imageUrl}
                alt=""
                loading="eager"
                decoding="sync"
                fetchPriority="high"
                onLoad={() => {
                  setLoadedRtlImageKey(currentRtlImageKey);
                }}
                width={currentRtlPage.width || undefined}
                height={currentRtlPage.height || undefined}
                className={`mx-auto ${
                  rtlFitMode === "WIDTH"
                    ? "w-full max-w-none"
                    : "w-auto max-w-full"
                } ${rtlPageImageLoaded ? "opacity-100" : "opacity-0"}`}
                style={{
                  aspectRatio: rtlPageAspectRatio,
                  ...(rtlFitMode === "WIDTH"
                    ? null
                    : { maxHeight: "95dvh", width: "auto", height: "auto" }),
                }}
              />
            </article>
          ) : null}
        </div>
      ) : (
        <div
          className={`mx-auto ${
            isWebtoon ? "max-w-3xl space-y-0" : "max-w-6xl space-y-6 sm:space-y-10"
          }`}
        >
          {visiblePages.map((page, index) =>
            page.imageUrl ? (
              <article
                key={page.id}
                ref={(element) => {
                  setPageRef(page.id, element);
                }}
                data-reader-page-id={page.id}
                className={`overflow-hidden ${
                  isWebtoon
                    ? "rounded-none border-0 bg-transparent p-0"
                    : "flex min-h-[72dvh] items-center justify-center rounded-none border-0 bg-transparent py-1 sm:min-h-[85dvh] sm:py-0"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.imageUrl}
                  alt=""
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding={index < 2 ? "sync" : "async"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  width={page.width || undefined}
                  height={page.height || undefined}
                  className={`mx-auto ${
                    isWebtoon
                      ? "block h-auto w-full"
                      : "block w-auto max-w-full"
                  }`}
                  style={
                    isWebtoon
                      ? undefined
                      : { maxHeight: "95dvh", width: "auto", height: "auto" }
                  }
                />
              </article>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
