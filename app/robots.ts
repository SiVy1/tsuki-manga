import type { MetadataRoute } from "next";

import { getAppBaseUrl } from "@/app/_lib/settings/app-url";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = await getAppBaseUrl();

  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
