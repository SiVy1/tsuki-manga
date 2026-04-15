"use server";

import { AssetKind, AssetScope } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { requireAdmin, requirePermission } from "@/app/_lib/auth/session";
import { PermissionBits } from "@/app/_lib/permissions/bits";
import { defaultInstanceSettings } from "@/app/_lib/settings/instance";
import { isUsableUploadFile, parseUploadedImage } from "@/app/_lib/storage/images";
import { buildAssetStorageKey } from "@/app/_lib/storage/keys";
import { storageDriver, getStorageDriverEnum } from "@/app/_lib/storage";
import {
  deleteSocialLinkInputSchema,
  deleteTaxonomyTermInputSchema,
  updateInstanceSettingsInputSchema,
  upsertSocialLinkInputSchema,
  upsertTaxonomyTermInputSchema,
} from "@/app/_lib/validation/settings";
import { fail, ok } from "@/app/_lib/utils/action-result";
import { resolveSlug } from "@/app/_lib/utils/slugs";

async function getOrCreateInstanceSettings() {
  const existing = await prisma.instanceSettings.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.instanceSettings.create({
    data: {
      ...defaultInstanceSettings,
    },
  });
}

async function replaceInstanceAsset(assetId: string | null | undefined) {
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

async function uploadInstanceAsset(kind: AssetKind, formData: FormData) {
  const user = await requirePermission(PermissionBits.SETTINGS);
  const file = formData.get("file");

  if (!isUsableUploadFile(file)) {
    return fail("A file is required.");
  }

  const settings = await getOrCreateInstanceSettings();
  let parsedImage;

  try {
    parsedImage = await parseUploadedImage(file);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Upload failed.");
  }

  const storageKey = buildAssetStorageKey(kind, settings.id, file.name);

  await storageDriver.put({
    key: storageKey,
    buffer: parsedImage.buffer,
    contentType: parsedImage.contentType,
    scope: AssetScope.PUBLIC,
  });

  const asset = await prisma.asset.create({
    data: {
      storageDriver: getStorageDriverEnum(),
      kind,
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

  const previousAssetId =
    kind === AssetKind.INSTANCE_LOGO ? settings.logoAssetId : settings.faviconAssetId;

  await prisma.instanceSettings.update({
    where: { id: settings.id },
    data:
      kind === AssetKind.INSTANCE_LOGO
        ? { logoAssetId: asset.id }
        : { faviconAssetId: asset.id },
  });

  if (previousAssetId) {
    await replaceInstanceAsset(previousAssetId);
  }

  return ok({
    assetId: asset.id,
    publicUrl: storageDriver.getPublicUrl(asset.storageKey),
  });
}

export async function updateInstanceSettingsAction(rawInput: unknown) {
  await requirePermission(PermissionBits.SETTINGS);
  const parsed = updateInstanceSettingsInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid settings input.");
  }

  const settings = await getOrCreateInstanceSettings();
  const updated = await prisma.instanceSettings.update({
    where: { id: settings.id },
    data: {
      groupName: parsed.data.groupName,
      groupDescription: parsed.data.groupDescription,
      siteTitle: parsed.data.siteTitle,
      siteDescription: parsed.data.siteDescription,
      keywords: parsed.data.keywords,
    },
  });

  return ok({ id: updated.id });
}

export async function uploadLogoAction(formData: FormData) {
  return uploadInstanceAsset(AssetKind.INSTANCE_LOGO, formData);
}

export async function uploadFaviconAction(formData: FormData) {
  return uploadInstanceAsset(AssetKind.INSTANCE_FAVICON, formData);
}

export async function upsertSocialLinkAction(rawInput: unknown) {
  await requirePermission(PermissionBits.SETTINGS);
  const parsed = upsertSocialLinkInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid social link input.");
  }

  const settings = await getOrCreateInstanceSettings();

  const socialLink = parsed.data.id
    ? await prisma.socialLink.update({
        where: { id: parsed.data.id },
        data: {
          label: parsed.data.label,
          url: parsed.data.url,
          iconType: parsed.data.iconType,
          iconSvg: parsed.data.iconSvg,
        },
      })
    : await prisma.socialLink.create({
        data: {
          instanceSettingsId: settings.id,
          label: parsed.data.label,
          url: parsed.data.url,
          iconType: parsed.data.iconType,
          iconSvg: parsed.data.iconSvg,
        },
      });

  return ok({ id: socialLink.id });
}

export async function deleteSocialLinkAction(rawInput: unknown) {
  await requirePermission(PermissionBits.SETTINGS);
  const parsed = deleteSocialLinkInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid social link delete request.");
  }

  await prisma.socialLink.delete({
    where: { id: parsed.data.id },
  });

  return ok({ id: parsed.data.id });
}

export async function upsertTaxonomyTermAction(rawInput: unknown) {
  await requireAdmin();
  const parsed = upsertTaxonomyTermInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid taxonomy input.");
  }

  const slug = resolveSlug(parsed.data.slug ?? parsed.data.name, parsed.data.name);

  const term = parsed.data.id
    ? await prisma.taxonomyTerm.update({
        where: { id: parsed.data.id },
        data: {
          name: parsed.data.name,
          slug,
          type: parsed.data.type,
        },
      })
    : await prisma.taxonomyTerm.create({
        data: {
          name: parsed.data.name,
          slug,
          type: parsed.data.type,
        },
      });

  return ok({ id: term.id, slug: term.slug });
}

export async function deleteTaxonomyTermAction(rawInput: unknown) {
  await requireAdmin();
  const parsed = deleteTaxonomyTermInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid taxonomy delete request.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.taxonomyTerm.update({
      where: { id: parsed.data.id },
      data: {
        series: {
          set: [],
        },
      },
    });

    await transaction.taxonomyTerm.delete({
      where: { id: parsed.data.id },
    });
  });

  return ok({ id: parsed.data.id });
}
