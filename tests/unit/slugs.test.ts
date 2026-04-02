import { describe, expect, it } from "vitest";

import { buildDefaultChapterSlug, resolveSlug, slugify } from "../../app/_lib/utils/slugs";
import { isUsableUploadFile } from "../../app/_lib/storage/images";

describe("slug helpers", () => {
  it("normalizes unicode input into kebab-case ascii", () => {
    expect(slugify("Moon Turtle!")).toBe("moon-turtle");
  });

  it("uses the fallback when the preferred input is empty", () => {
    expect(resolveSlug("   ", "Special chapter")).toBe("special-chapter");
  });

  it("returns a stable fallback slug for fully empty values", () => {
    expect(resolveSlug("", "")).toBe("untitled");
  });

  it("builds chapter slugs with the series slug as context", () => {
    expect(buildDefaultChapterSlug("lunar-notes", "1", null)).toBe(
      "lunar-notes-chapter-1",
    );
    expect(buildDefaultChapterSlug("lunar-notes", "12.5", "extra")).toBe(
      "lunar-notes-chapter-12-5-extra",
    );
  });

  it("filters out empty upload placeholders", () => {
    expect(isUsableUploadFile(new File([], ""))).toBe(false);
    expect(isUsableUploadFile(new File(["hello"], "page.png"))).toBe(true);
  });
});
