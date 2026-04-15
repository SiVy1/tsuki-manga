import { prisma } from "@/app/_lib/db/client";

export const defaultInstanceSettings = {
  groupName: "Tsuki Manga",
  groupDescription: null,
  siteTitle: "Tsuki Manga",
  siteDescription: "Self-hosted manga reading and publishing platform.",
  keywords: [] as string[],
};

export async function getInstanceSettings() {
  let settings = null;

  try {
    settings = await prisma.instanceSettings.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      include: {
        logoAsset: true,
        faviconAsset: true,
        socialLinks: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  } catch {
    settings = null;
  }

  if (!settings) {
    return {
      ...defaultInstanceSettings,
      id: null,
      createdAt: null,
      updatedAt: null,
      logoAsset: null,
      faviconAsset: null,
      socialLinks: [],
    };
  }

  return settings;
}
