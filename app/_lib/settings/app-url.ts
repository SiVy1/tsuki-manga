import { headers } from "next/headers";

import { getEnv } from "@/app/_lib/settings/env";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export async function getAppBaseUrl() {
  const env = getEnv();

  if (env.APP_URL) {
    return trimTrailingSlash(env.APP_URL);
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return "http://localhost:3000";
  }

  return trimTrailingSlash(`${protocol}://${host}`);
}
