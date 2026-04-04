import { prisma } from "@/app/_lib/db/client";
import { getInstanceSettings } from "@/app/_lib/settings/instance";

type ExportAsset = {
  id: string;
  storageDriver: string;
  kind: string;
  scope: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  width: number | null;
  height: number | null;
  createdAt: string;
};

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function createAssetManifestBuilder() {
  const assets = new Map<string, ExportAsset>();

  return {
    add(asset: {
      id: string;
      storageDriver: string;
      kind: string;
      scope: string;
      storageKey: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: bigint;
      width: number | null;
      height: number | null;
      createdAt: Date;
    } | null | undefined) {
      if (!asset || assets.has(asset.id)) {
        return;
      }

      assets.set(asset.id, {
        id: asset.id,
        storageDriver: asset.storageDriver,
        kind: asset.kind,
        scope: asset.scope,
        storageKey: asset.storageKey,
        originalFilename: asset.originalFilename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes.toString(),
        width: asset.width ?? null,
        height: asset.height ?? null,
        createdAt: asset.createdAt.toISOString(),
      });
    },
    list() {
      return [...assets.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },
  };
}

export async function buildContentExportPayload() {
  const [instanceSettings, taxonomyTerms, series] = await Promise.all([
    getInstanceSettings(),
    prisma.taxonomyTerm.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.series.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        coverAsset: true,
        taxonomyTerms: {
          orderBy: [{ type: "asc" }, { name: "asc" }],
        },
        chapters: {
          where: {
            deletedAt: null,
          },
          include: {
            pages: {
              include: {
                asset: true,
              },
              orderBy: {
                pageOrder: "asc",
              },
            },
          },
          orderBy: [{ number: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy: {
        updatedAt: "asc",
      },
    }),
  ]);

  const assetManifest = createAssetManifestBuilder();
  assetManifest.add(instanceSettings.logoAsset);
  assetManifest.add(instanceSettings.faviconAsset);

  const exportSeries = series.map((entry) => {
    assetManifest.add(entry.coverAsset);

    return {
      id: entry.id,
      title: entry.title,
      slug: entry.slug,
      descriptionShort: entry.descriptionShort,
      descriptionLong: entry.descriptionLong,
      visibility: entry.visibility,
      coverAssetId: entry.coverAssetId,
      taxonomyTermIds: entry.taxonomyTerms.map((term) => term.id),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      chapters: entry.chapters.map((chapter) => ({
        id: chapter.id,
        slug: chapter.slug,
        number: chapter.number.toString(),
        label: chapter.label,
        title: chapter.title,
        status: chapter.status,
        publishedAt: toIsoString(chapter.publishedAt),
        createdAt: chapter.createdAt.toISOString(),
        updatedAt: chapter.updatedAt.toISOString(),
        pages: chapter.pages.map((page) => {
          assetManifest.add(page.asset);

          return {
            id: page.id,
            pageOrder: page.pageOrder,
            width: page.width,
            height: page.height,
            assetId: page.assetId,
          };
        }),
      })),
    };
  });

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    instance: {
      id: instanceSettings.id,
      groupName: instanceSettings.groupName,
      groupDescription: instanceSettings.groupDescription,
      siteTitle: instanceSettings.siteTitle,
      siteDescription: instanceSettings.siteDescription,
      keywords: instanceSettings.keywords,
      logoAssetId: instanceSettings.logoAsset?.id ?? null,
      faviconAssetId: instanceSettings.faviconAsset?.id ?? null,
      socialLinks: instanceSettings.socialLinks.map((link) => ({
        id: link.id,
        label: link.label,
        url: link.url,
        iconType: link.iconType,
        iconSvg: link.iconSvg,
      })),
      taxonomyTerms: taxonomyTerms.map((term) => ({
        id: term.id,
        name: term.name,
        slug: term.slug,
        type: term.type,
      })),
    },
    series: exportSeries,
    assets: assetManifest.list(),
  };
}
