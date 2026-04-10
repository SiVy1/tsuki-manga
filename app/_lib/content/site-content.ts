import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { siteContentSchema, type SiteContent } from "@/app/_lib/validation/site-content";

const siteContentLocalPath = path.join(process.cwd(), "content", "site.local.json");
const siteContentDefaultPath = path.join(process.cwd(), "content", "site.default.json");

const defaultSiteContent: SiteContent = {
  rules: {
    enabled: false,
    title: "Community rules",
    updatedAt: null,
    items: [],
  },
  recruitment: {
    enabled: false,
    title: "We are recruiting",
    summary: null,
    roles: [],
    contact: null,
  },
};

async function loadSiteContentFile(filePath: string, label: string) {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    const result = siteContentSchema.safeParse(parsed);

    if (!result.success) {
      console.error(`Invalid ${label}`, result.error.flatten());
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const localContent = await loadSiteContentFile(siteContentLocalPath, "content/site.local.json");

  if (localContent) {
    return localContent;
  }

  const defaultContent = await loadSiteContentFile(
    siteContentDefaultPath,
    "content/site.default.json",
  );

  if (defaultContent) {
    return defaultContent;
  }

  console.error("Failed to load site content from content/site.local.json or content/site.default.json.");
  return defaultSiteContent;
});
