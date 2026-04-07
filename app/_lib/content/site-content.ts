import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { siteContentSchema, type SiteContent } from "@/app/_lib/validation/site-content";

const siteContentPath = path.join(process.cwd(), "content", "site.json");

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

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  try {
    const raw = await readFile(siteContentPath, "utf8");
    const parsed = JSON.parse(raw);
    const result = siteContentSchema.safeParse(parsed);

    if (!result.success) {
      console.error("Invalid content/site.json", result.error.flatten());
      return defaultSiteContent;
    }

    return result.data;
  } catch (error) {
    console.error("Failed to load content/site.json", error);
    return defaultSiteContent;
  }
});
