import { prisma } from "@/app/_lib/db/client";

export async function assertSeriesSlugAvailable(slug: string, excludeSeriesId?: string) {
  const [existingSeries, existingHistory] = await Promise.all([
    prisma.series.findFirst({
      where: {
        slug,
        ...(excludeSeriesId ? { id: { not: excludeSeriesId } } : {}),
      },
      select: { id: true },
    }),
    prisma.seriesSlugHistory.findFirst({
      where: {
        slug,
        ...(excludeSeriesId ? { seriesId: { not: excludeSeriesId } } : {}),
      },
      select: { id: true },
    }),
  ]);

  if (existingSeries || existingHistory) {
    throw new Error("Series slug is already reserved.");
  }
}

export async function assertChapterSlugAvailable(slug: string, excludeChapterId?: string) {
  const [existingChapter, existingHistory] = await Promise.all([
    prisma.chapter.findFirst({
      where: {
        slug,
        ...(excludeChapterId ? { id: { not: excludeChapterId } } : {}),
      },
      select: { id: true },
    }),
    prisma.chapterSlugHistory.findFirst({
      where: {
        slug,
        ...(excludeChapterId ? { chapterId: { not: excludeChapterId } } : {}),
      },
      select: { id: true },
    }),
  ]);

  if (existingChapter || existingHistory) {
    throw new Error("Chapter slug is already reserved.");
  }
}
