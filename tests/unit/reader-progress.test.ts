import { describe, expect, it } from "vitest";

import {
  createStoredReadingProgress,
  getPageList,
  parseStoredReadingProgress,
  resolveLatestReadingProgressSnapshot,
  resolveResumeProgress,
  type ReaderPage,
} from "@/app/_lib/reader/client";

const pages: ReaderPage[] = [
  {
    id: "page-1",
    imageUrl: "/page-1.png",
    width: 100,
    height: 200,
    pageOrder: 1,
  },
  {
    id: "page-2",
    imageUrl: "/page-2.png",
    width: 100,
    height: 200,
    pageOrder: 2,
  },
  {
    id: "page-3",
    imageUrl: "/page-3.png",
    width: 100,
    height: 200,
    pageOrder: 3,
  },
];

describe("reader progress helpers", () => {
  it("reverses visible pages only for right-to-left mode", () => {
    expect(getPageList("WEBTOON", pages).map((page) => page.id)).toEqual([
      "page-1",
      "page-2",
      "page-3",
    ]);

    expect(getPageList("RIGHT_TO_LEFT", pages).map((page) => page.id)).toEqual([
      "page-3",
      "page-2",
      "page-1",
    ]);
  });

  it("parses valid stored reading progress", () => {
    const progress = createStoredReadingProgress("chapter-1", pages[1], false, {
      chapterSlug: "chapter-1",
      chapterNumber: "12",
      chapterLabel: null,
      chapterTitle: "Arrival",
      seriesTitle: "Moonlight",
      seriesSlug: "moonlight",
      coverUrl: "/cover.png",
    });

    expect(parseStoredReadingProgress(JSON.stringify(progress))).toEqual(progress);
  });

  it("rejects invalid stored reading progress values", () => {
    expect(parseStoredReadingProgress(null)).toBeNull();
    expect(parseStoredReadingProgress("{")).toBeNull();
    expect(
      parseStoredReadingProgress(
        JSON.stringify({
          chapterId: "chapter-1",
          pageId: "page-2",
          pageOrder: "2",
          completed: false,
          updatedAt: Date.now(),
        }),
      ),
    ).toBeNull();
  });

  it("offers resume only for a valid middle page in the visible sequence", () => {
    const progress = createStoredReadingProgress("chapter-1", pages[1], false);

    expect(
      resolveResumeProgress("chapter-1", pages, JSON.stringify(progress)),
    ).toEqual({
      pageId: "page-2",
      pageOrder: 2,
      visiblePageNumber: 2,
    });
  });

  it("does not offer resume for first page, last page, completed chapter, or wrong chapter", () => {
    expect(
      resolveResumeProgress(
        "chapter-1",
        pages,
        JSON.stringify(createStoredReadingProgress("chapter-1", pages[0], false)),
      ),
    ).toBeNull();

    expect(
      resolveResumeProgress(
        "chapter-1",
        pages,
        JSON.stringify(createStoredReadingProgress("chapter-1", pages[2], false)),
      ),
    ).toBeNull();

    expect(
      resolveResumeProgress(
        "chapter-1",
        pages,
        JSON.stringify(createStoredReadingProgress("chapter-1", pages[1], true)),
      ),
    ).toBeNull();

    expect(
      resolveResumeProgress(
        "chapter-1",
        pages,
        JSON.stringify(createStoredReadingProgress("chapter-2", pages[1], false)),
      ),
    ).toBeNull();
  });

  it("uses the visible page order for right-to-left resume logic", () => {
    const visiblePages = getPageList("RIGHT_TO_LEFT", pages);

    expect(
      resolveResumeProgress(
        "chapter-1",
        visiblePages,
        JSON.stringify(createStoredReadingProgress("chapter-1", pages[1], false)),
      ),
    ).toEqual({
      pageId: "page-2",
      pageOrder: 2,
      visiblePageNumber: 2,
    });

    expect(
      resolveResumeProgress(
        "chapter-1",
        visiblePages,
        JSON.stringify(createStoredReadingProgress("chapter-1", pages[2], false)),
      ),
    ).toBeNull();
  });

  it("resolves the latest unfinished snapshot with enough context for home continue reading", () => {
    const previousWindow = globalThis.window;
    const localStorageState = new Map<string, string>([
      [
        "tsuki-reader-progress:chapter-1",
        JSON.stringify(
          createStoredReadingProgress("chapter-1", pages[1], false, {
            chapterSlug: "chapter-1",
            chapterNumber: "1",
            chapterLabel: null,
            chapterTitle: "Arrival",
            seriesTitle: "Moonlight",
            seriesSlug: "moonlight",
            coverUrl: "/moonlight.png",
          }),
        ),
      ],
      [
        "tsuki-reader-progress:chapter-2",
        JSON.stringify(
          createStoredReadingProgress("chapter-2", pages[1], false, {
            chapterSlug: "chapter-2",
            chapterNumber: "2",
            chapterLabel: "Extra",
            chapterTitle: "Return",
            seriesTitle: "Sunrise",
            seriesSlug: "sunrise",
            coverUrl: "/sunrise.png",
          }),
        ),
      ],
    ]);

    const chapterTwo = JSON.parse(localStorageState.get("tsuki-reader-progress:chapter-2")!);
    chapterTwo.updatedAt += 1000;
    localStorageState.set("tsuki-reader-progress:chapter-2", JSON.stringify(chapterTwo));

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          get length() {
            return localStorageState.size;
          },
          key(index: number) {
            return Array.from(localStorageState.keys())[index] ?? null;
          },
          getItem(key: string) {
            return localStorageState.get(key) ?? null;
          },
        },
      },
    });

    try {
      expect(resolveLatestReadingProgressSnapshot()).toEqual({
        chapterId: "chapter-2",
        chapterSlug: "chapter-2",
        chapterNumber: "2",
        chapterLabel: "Extra",
        chapterTitle: "Return",
        seriesTitle: "Sunrise",
        seriesSlug: "sunrise",
        coverUrl: "/sunrise.png",
        updatedAt: chapterTwo.updatedAt,
      });
    } finally {
      if (previousWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: previousWindow,
        });
      }
    }
  });

  it("returns a stable snapshot reference when local progress did not change", () => {
    const previousWindow = globalThis.window;
    const localStorageState = new Map<string, string>([
      [
        "tsuki-reader-progress:chapter-1",
        JSON.stringify(
          createStoredReadingProgress("chapter-1", pages[1], false, {
            chapterSlug: "chapter-1",
            chapterNumber: "1",
            chapterLabel: null,
            chapterTitle: "Arrival",
            seriesTitle: "Moonlight",
            seriesSlug: "moonlight",
            coverUrl: "/moonlight.png",
          }),
        ),
      ],
    ]);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          get length() {
            return localStorageState.size;
          },
          key(index: number) {
            return Array.from(localStorageState.keys())[index] ?? null;
          },
          getItem(key: string) {
            return localStorageState.get(key) ?? null;
          },
        },
      },
    });

    try {
      const first = resolveLatestReadingProgressSnapshot();
      const second = resolveLatestReadingProgressSnapshot();

      expect(first).toBe(second);
    } finally {
      if (previousWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: previousWindow,
        });
      }
    }
  });
});
