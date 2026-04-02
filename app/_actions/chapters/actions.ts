"use server";

import { redirect } from "next/navigation";

import { Prisma, AssetKind, AssetScope, ChapterStatus } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { assertChapterSlugAvailable } from "@/app/_lib/db/slugs";
import { requireAdmin, requirePermission } from "@/app/_lib/auth/session";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import {
  assertChapterUploadLimit,
  isUsableUploadFile,
  parseUploadedImage,
} from "@/app/_lib/storage/images";
import { buildAssetStorageKey } from "@/app/_lib/storage/keys";
import { storageDriver, getStorageDriverEnum } from "@/app/_lib/storage";
import {
  createChapterInputSchema,
  publishChapterInputSchema,
  reorderChapterPagesInputSchema,
  restoreChapterInputSchema,
  softDeleteChapterInputSchema,
  unpublishChapterInputSchema,
  updateChapterInputSchema,
} from "@/app/_lib/validation/chapters";
import { fail, ok } from "@/app/_lib/utils/action-result";
import { buildDefaultChapterSlug, resolveSlug } from "@/app/_lib/utils/slugs";

async function getEditableChapter(chapterId: string) {
  return prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      series: {
        select: {
          id: true,
          deletedAt: true,
          visibility: true,
        },
      },
      pages: {
        include: {
          asset: true,
        },
        orderBy: {
          pageOrder: "asc",
        },
      },
    },
  });
}

export async function createChapterAction(rawInput: unknown) {
  const user = await requirePermission(PermissionBits.CHAPTERS);
  const parsed = createChapterInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid chapter input.");
  }

  const series = await prisma.series.findUnique({
    where: { id: parsed.data.seriesId },
    select: { id: true, slug: true, deletedAt: true },
  });

  if (!series || series.deletedAt) {
    return fail("Series not found.");
  }

  const slug = resolveSlug(
    parsed.data.slug ?? buildDefaultChapterSlug(series.slug, parsed.data.number, parsed.data.label),
    buildDefaultChapterSlug(series.slug, parsed.data.number, parsed.data.label),
  );

  try {
    await assertChapterSlugAvailable(slug);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Chapter slug is already reserved.");
  }

  const chapter = await prisma.chapter.create({
    data: {
      seriesId: parsed.data.seriesId,
      slug,
      number: new Prisma.Decimal(parsed.data.number),
      label: parsed.data.label,
      title: parsed.data.title,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  return ok({
    id: chapter.id,
    slug: chapter.slug,
  });
}

export async function updateChapterRedirectAction(
  chapterId: string,
  seriesId: string,
  formData: FormData,
) {
  const result = await updateChapterAction({
    id: chapterId,
    seriesId,
    number: formData.get("number")?.toString() ?? "",
    label: formData.get("label")?.toString() ?? "",
    title: formData.get("title")?.toString() ?? "",
    slug: formData.get("slug")?.toString() ?? "",
  });

  if (!result.success) {
    redirect(`/dashboard/chapters/${chapterId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(
    `/dashboard/chapters/${chapterId}?notice=${encodeURIComponent("Chapter updated.")}`,
  );
}

export async function updateChapterAction(rawInput: unknown) {
  const user = await requirePermission(PermissionBits.CHAPTERS);
  const parsed = updateChapterInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid chapter input.");
  }

  const existingChapter = await prisma.chapter.findUnique({
    where: { id: parsed.data.id },
    include: {
      series: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!existingChapter || existingChapter.deletedAt) {
    return fail("Chapter not found.");
  }

  const slug = resolveSlug(
    parsed.data.slug ??
      buildDefaultChapterSlug(
        existingChapter.series.slug,
        parsed.data.number,
        parsed.data.label,
      ),
    buildDefaultChapterSlug(
      existingChapter.series.slug,
      parsed.data.number,
      parsed.data.label,
    ),
  );

  try {
    if (slug !== existingChapter.slug) {
      await assertChapterSlugAvailable(slug, existingChapter.id);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Chapter slug is already reserved.");
  }

  const chapter = await prisma.$transaction(async (transaction) => {
    if (slug !== existingChapter.slug) {
      await transaction.chapterSlugHistory.create({
        data: {
          chapterId: existingChapter.id,
          slug: existingChapter.slug,
        },
      });
    }

    return transaction.chapter.update({
      where: { id: existingChapter.id },
      data: {
        slug,
        number: new Prisma.Decimal(parsed.data.number),
        label: parsed.data.label,
        title: parsed.data.title,
        updatedById: user.id,
      },
    });
  });

  return ok({
    id: chapter.id,
    slug: chapter.slug,
  });
}

export async function uploadChapterPagesAction(chapterId: string, formData: FormData) {
  const user = await requirePermission(PermissionBits.CHAPTERS);
  const chapter = await getEditableChapter(chapterId);

  if (!chapter || chapter.deletedAt || chapter.series.deletedAt) {
    return fail("Chapter not found.");
  }

  if (chapter.status !== ChapterStatus.DRAFT) {
    return fail("Only draft chapters can accept new page uploads.");
  }

  const files = formData.getAll("files").filter(isUsableUploadFile);

  if (!files.length) {
    return fail("At least one image file is required.");
  }

  try {
    assertChapterUploadLimit(files);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Chapter upload failed.");
  }

  const startingOrder = chapter.pages.length;
  const createdPages = [];

  try {
    for (const [index, file] of files.entries()) {
      const parsedImage = await parseUploadedImage(file);
      const storageKey = buildAssetStorageKey(AssetKind.CHAPTER_PAGE, chapter.id, file.name);

      await storageDriver.put({
        key: storageKey,
        buffer: parsedImage.buffer,
        contentType: parsedImage.contentType,
        scope: AssetScope.DRAFT,
      });

      const asset = await prisma.asset.create({
        data: {
          storageDriver: getStorageDriverEnum(),
          kind: AssetKind.CHAPTER_PAGE,
          scope: AssetScope.DRAFT,
          storageKey,
          originalFilename: parsedImage.originalFilename,
          mimeType: parsedImage.contentType,
          sizeBytes: parsedImage.sizeBytes,
          width: parsedImage.width,
          height: parsedImage.height,
          createdById: user.id,
        },
      });

      const page = await prisma.chapterPage.create({
        data: {
          chapterId: chapter.id,
          assetId: asset.id,
          pageOrder: startingOrder + index + 1,
          width: parsedImage.width ?? 0,
          height: parsedImage.height ?? 0,
        },
      });

      createdPages.push({
        id: page.id,
        pageOrder: page.pageOrder,
        assetId: asset.id,
      });
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Chapter upload failed.");
  }

  return ok({
    chapterId: chapter.id,
    pages: createdPages,
  });
}

export async function uploadChapterPagesRedirectAction(
  chapterId: string,
  formData: FormData,
) {
  const result = await uploadChapterPagesAction(chapterId, formData);

  if (!result.success) {
    redirect(`/dashboard/chapters/${chapterId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(
    `/dashboard/chapters/${chapterId}?notice=${encodeURIComponent("Pages uploaded.")}`,
  );
}

export async function reorderChapterPagesAction(rawInput: unknown) {
  await requirePermission(PermissionBits.CHAPTERS);
  const parsed = reorderChapterPagesInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid reorder request.");
  }

  const chapter = await getEditableChapter(parsed.data.chapterId);

  if (!chapter || chapter.deletedAt || chapter.series.deletedAt) {
    return fail("Chapter not found.");
  }

  if (chapter.status !== ChapterStatus.DRAFT) {
    return fail("Only draft chapters can reorder pages.");
  }

  const pageIds = new Set(chapter.pages.map((page) => page.id));
  const hasForeignPage = parsed.data.pages.some((page) => !pageIds.has(page.id));

  if (hasForeignPage) {
    return fail("Reorder payload includes pages outside the target chapter.");
  }

  await prisma.$transaction(
    parsed.data.pages.map((page) =>
      prisma.chapterPage.update({
        where: { id: page.id },
        data: { pageOrder: page.pageOrder },
      }),
    ),
  );

  return ok({ chapterId: parsed.data.chapterId });
}

export async function reorderChapterPagesRedirectAction(
  chapterId: string,
  formData: FormData,
) {
  const pageIds = formData
    .getAll("pageIds")
    .map((value) => value.toString())
    .filter(Boolean);

  const result = await reorderChapterPagesAction({
    chapterId,
    pages: pageIds.map((pageId) => ({
      id: pageId,
      pageOrder: Number(formData.get(`pageOrder:${pageId}`)?.toString() ?? "0"),
    })),
  });

  if (!result.success) {
    redirect(`/dashboard/chapters/${chapterId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(
    `/dashboard/chapters/${chapterId}?notice=${encodeURIComponent("Page order updated.")}`,
  );
}

export async function publishChapterAction(rawInput: unknown) {
  await requirePermission(PermissionBits.PUBLISH);
  const parsed = publishChapterInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid publish request.");
  }

  const chapter = await getEditableChapter(parsed.data.chapterId);

  if (!chapter || chapter.deletedAt || chapter.series.deletedAt) {
    return fail("Chapter not found.");
  }

  if (chapter.pages.length === 0) {
    return fail("Chapter cannot be published without pages.");
  }

  for (const page of chapter.pages) {
    if (page.asset.scope !== AssetScope.PUBLIC) {
      await storageDriver.changeScope(
        page.asset.storageKey,
        page.asset.scope,
        AssetScope.PUBLIC,
      );
    }
  }

  await prisma.$transaction([
    prisma.chapter.update({
      where: { id: chapter.id },
      data: {
        status: ChapterStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    }),
    prisma.asset.updateMany({
      where: {
        id: {
          in: chapter.pages.map((page) => page.asset.id),
        },
      },
      data: {
        scope: AssetScope.PUBLIC,
      },
    }),
  ]);

  return ok({ chapterId: chapter.id });
}

export async function publishChapterRedirectAction(chapterId: string) {
  const result = await publishChapterAction({
    chapterId,
  });

  if (!result.success) {
    redirect(`/dashboard/chapters/${chapterId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(
    `/dashboard/chapters/${chapterId}?notice=${encodeURIComponent("Chapter published.")}`,
  );
}

export async function unpublishChapterAction(rawInput: unknown) {
  await requirePermission(PermissionBits.PUBLISH);
  const parsed = unpublishChapterInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid unpublish request.");
  }

  const chapter = await getEditableChapter(parsed.data.chapterId);

  if (!chapter || chapter.deletedAt || chapter.series.deletedAt) {
    return fail("Chapter not found.");
  }

  for (const page of chapter.pages) {
    if (page.asset.scope !== AssetScope.DRAFT) {
      await storageDriver.changeScope(
        page.asset.storageKey,
        page.asset.scope,
        AssetScope.DRAFT,
      );
    }
  }

  await prisma.$transaction([
    prisma.chapter.update({
      where: { id: chapter.id },
      data: {
        status: ChapterStatus.DRAFT,
        publishedAt: null,
      },
    }),
    prisma.asset.updateMany({
      where: {
        id: {
          in: chapter.pages.map((page) => page.asset.id),
        },
      },
      data: {
        scope: AssetScope.DRAFT,
      },
    }),
  ]);

  return ok({ chapterId: chapter.id });
}

export async function unpublishChapterRedirectAction(chapterId: string) {
  const result = await unpublishChapterAction({
    chapterId,
  });

  if (!result.success) {
    redirect(`/dashboard/chapters/${chapterId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(
    `/dashboard/chapters/${chapterId}?notice=${encodeURIComponent(
      "Chapter returned to draft.",
    )}`,
  );
}

export async function softDeleteChapterAction(rawInput: unknown) {
  await requireAdmin();
  const parsed = softDeleteChapterInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid chapter delete request.");
  }

  await prisma.chapter.update({
    where: { id: parsed.data.chapterId },
    data: {
      deletedAt: new Date(),
    },
  });

  return ok({ chapterId: parsed.data.chapterId });
}

export async function softDeleteChapterRedirectAction(chapterId: string) {
  const result = await softDeleteChapterAction({
    chapterId,
  });

  if (!result.success) {
    redirect(`/dashboard/chapters/${chapterId}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(
    `/dashboard/trash/chapters?notice=${encodeURIComponent("Chapter moved to trash.")}`,
  );
}

export async function restoreChapterAction(rawInput: unknown) {
  await requireAdmin();
  const parsed = restoreChapterInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid chapter restore request.");
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: parsed.data.chapterId },
    include: {
      series: true,
    },
  });

  if (!chapter) {
    return fail("Chapter not found.");
  }

  if (chapter.series.deletedAt && !parsed.data.restoreSeries) {
    return {
      success: false as const,
      error: "Series restore confirmation is required.",
      requiresSeriesRestore: true,
    };
  }

  await prisma.$transaction(async (transaction) => {
    if (chapter.series.deletedAt && parsed.data.restoreSeries) {
      await transaction.series.update({
        where: { id: chapter.seriesId },
        data: {
          deletedAt: null,
          visibility: "HIDDEN",
        },
      });
    }

    await transaction.chapter.update({
      where: { id: chapter.id },
      data: {
        deletedAt: null,
        status: ChapterStatus.DRAFT,
        publishedAt: null,
      },
    });
  });

  return ok({ chapterId: chapter.id });
}
