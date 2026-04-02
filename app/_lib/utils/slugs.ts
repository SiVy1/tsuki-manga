const transliterationMap: Record<string, string> = {
  ł: "l",
  Ł: "L",
};

export function slugify(input: string) {
  return input
    .replace(/[łŁ]/g, (character) => transliterationMap[character] ?? character)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function resolveSlug(input: string, fallback: string) {
  const normalized = slugify(input);
  return normalized || slugify(fallback) || "untitled";
}

export function buildDefaultChapterSlug(
  seriesSlug: string,
  chapterNumber: string,
  chapterLabel?: string | null,
) {
  const labelPart = chapterLabel?.trim() ? `-${chapterLabel}` : "";
  return resolveSlug(
    `${seriesSlug}-chapter-${chapterNumber}${labelPart}`,
    `chapter-${chapterNumber}${labelPart}`,
  );
}
