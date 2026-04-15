"use server";

import { AssetKind, AssetScope } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { assertSeriesSlugAvailable } from "@/app/_lib/db/slugs";
import { notifySeriesCreated } from "@/app/_lib/notifications/discord";
import { requireAdmin, requirePermission } from "@/app/_lib/auth/session";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { isUsableUploadFile, parseUploadedImage } from "@/app/_lib/storage/images";
import { buildAssetStorageKey } from "@/app/_lib/storage/keys";
import { storageDriver, getStorageDriverEnum } from "@/app/_lib/storage";
import {
  createSeriesInputSchema,
  restoreSeriesInputSchema,
  softDeleteSeriesInputSchema,
  updateSeriesInputSchema,
} from "@/app/_lib/validation/series";
import { fail, ok } from "@/app/_lib/utils/action-result";
import { resolveSlug } from "@/app/_lib/utils/slugs";

async function deleteAssetById(assetId: string | null | undefined) {
  if (!assetId) {
    return;
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    return;
  }

  await storageDriver.delete(asset.storageKey, asset.scope);
  await prisma.asset.delete({
    where: { id: asset.id },
  });
}

export async function createSeriesAction(rawInput: unknown) {
  const user = await requirePermission(PermissionBits.SERIES);
  const parsed = createSeriesInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid series input.");
  }

  const slug = resolveSlug(parsed.data.slug ?? parsed.data.title, parsed.data.title);

  try {
    await assertSeriesSlugAvailable(slug);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Series slug is already reserved.");
  }

  const series = await prisma.series.create({
    data: {
      title: parsed.data.title,
      slug,
      descriptionShort: parsed.data.descriptionShort,
      descriptionLong: parsed.data.descriptionLong,
      visibility: parsed.data.visibility,
      createdById: user.id,
      updatedById: user.id,
      coverAssetId: parsed.data.coverAssetId ?? null,
      taxonomyTerms: parsed.data.taxonomyTermIds.length
        ? {
            connect: parsed.data.taxonomyTermIds.map((id) => ({ id })),
          }
        : undefined,
    },
  });

  const createdSeries = await prisma.series.findUnique({
    where: {
      id: series.id,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      descriptionShort: true,
      visibility: true,
      coverAsset: {
        select: {
          storageKey: true,
        },
      },
    },
  });

  if (createdSeries) {
    await notifySeriesCreated({
      seriesId: createdSeries.id,
      title: createdSeries.title,
      slug: createdSeries.slug,
      descriptionShort: createdSeries.descriptionShort,
      coverUrl: createdSeries.coverAsset
        ? storageDriver.getPublicUrl(createdSeries.coverAsset.storageKey)
        : null,
      visibility: createdSeries.visibility,
    });
  }

  return ok({
    id: series.id,
    slug: series.slug,
  });
}

export async function updateSeriesAction(rawInput: unknown) {
  const user = await requirePermission(PermissionBits.SERIES);
  const parsed = updateSeriesInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid series input.");
  }

  const existingSeries = await prisma.series.findUnique({
    where: { id: parsed.data.id },
  });

  if (!existingSeries || existingSeries.deletedAt) {
    return fail("Series not found.");
  }

  const nextSlug = resolveSlug(
    parsed.data.slug ?? parsed.data.title,
    parsed.data.title,
  );

  try {
    if (nextSlug !== existingSeries.slug) {
      await assertSeriesSlugAvailable(nextSlug, existingSeries.id);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Series slug is already reserved.");
  }

  const series = await prisma.$transaction(async (transaction) => {
    if (nextSlug !== existingSeries.slug) {
      await transaction.seriesSlugHistory.create({
        data: {
          seriesId: existingSeries.id,
          slug: existingSeries.slug,
        },
      });
    }

    return transaction.series.update({
      where: { id: existingSeries.id },
      data: {
        title: parsed.data.title,
        slug: nextSlug,
        descriptionShort: parsed.data.descriptionShort,
        descriptionLong: parsed.data.descriptionLong,
        visibility: parsed.data.visibility,
        updatedById: user.id,
        coverAssetId: parsed.data.coverAssetId ?? null,
        taxonomyTerms: {
          set: parsed.data.taxonomyTermIds.map((id) => ({ id })),
        },
      },
    });
  });

  return ok({
    id: series.id,
    slug: series.slug,
  });
}

export async function uploadSeriesCoverAction(seriesId: string, formData: FormData) {
  const user = await requirePermission(PermissionBits.SERIES);
  const file = formData.get("file");

  if (!isUsableUploadFile(file)) {
    return fail("A cover file is required.");
  }

  const series = await prisma.series.findUnique({
    where: { id: seriesId },
    select: {
      id: true,
      coverAssetId: true,
      deletedAt: true,
    },
  });

  if (!series || series.deletedAt) {
    return fail("Series not found.");
  }

  let parsedImage;

  try {
    parsedImage = await parseUploadedImage(file);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Cover upload failed.");
  }

  const storageKey = buildAssetStorageKey(AssetKind.SERIES_COVER, series.id, file.name);

  await storageDriver.put({
    key: storageKey,
    buffer: parsedImage.buffer,
    contentType: parsedImage.contentType,
    scope: AssetScope.PUBLIC,
  });

  const asset = await prisma.asset.create({
    data: {
      storageDriver: getStorageDriverEnum(),
      kind: AssetKind.SERIES_COVER,
      scope: AssetScope.PUBLIC,
      storageKey,
      originalFilename: parsedImage.originalFilename,
      mimeType: parsedImage.contentType,
      sizeBytes: parsedImage.sizeBytes,
      width: parsedImage.width,
      height: parsedImage.height,
      createdById: user.id,
    },
  });

  await prisma.series.update({
    where: { id: series.id },
    data: {
      coverAssetId: asset.id,
      updatedById: user.id,
    },
  });

  if (series.coverAssetId) {
    await deleteAssetById(series.coverAssetId);
  }

  return ok({
    assetId: asset.id,
    publicUrl: storageDriver.getPublicUrl(asset.storageKey),
  });
}

export async function softDeleteSeriesAction(rawInput: unknown) {
  await requireAdmin();
  const parsed = softDeleteSeriesInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid series delete request.");
  }

  const deletedAt = new Date();

  await prisma.$transaction([
    prisma.series.update({
      where: { id: parsed.data.id },
      data: { deletedAt },
    }),
    prisma.chapter.updateMany({
      where: {
        seriesId: parsed.data.id,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    }),
  ]);

  return ok({ id: parsed.data.id });
}

export async function restoreSeriesAction(rawInput: unknown) {
  await requireAdmin();
  const parsed = restoreSeriesInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid series restore request.");
  }

  await prisma.$transaction([
    prisma.series.update({
      where: { id: parsed.data.id },
      data: {
        deletedAt: null,
        visibility: "HIDDEN",
      },
    }),
    prisma.chapter.updateMany({
      where: { seriesId: parsed.data.id },
      data: {
        deletedAt: null,
        status: "DRAFT",
        publishedAt: null,
      },
    }),
  ]);

  return ok({ id: parsed.data.id });
}
