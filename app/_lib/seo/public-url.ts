import { getAppBaseUrl } from "@/app/_lib/settings/app-url";

function trimLeadingSlash(value: string) {
  return value.replace(/^\/+/, "");
}

export async function buildAbsoluteUrl(path = "") {
  const baseUrl = await getAppBaseUrl();

  if (!path) {
    return baseUrl;
  }

  return `${baseUrl}/${trimLeadingSlash(path)}`;
}

export async function getDefaultOgImageUrl() {
  return buildAbsoluteUrl("opengraph-image");
}
