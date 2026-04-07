import { getEnv } from "@/app/_lib/settings/env";

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function syncAuthEnvironmentFromAppUrl() {
  const env = getEnv();

  if (!env.APP_URL) {
    return;
  }

  if (!hasValue(process.env.AUTH_URL)) {
    process.env.AUTH_URL = env.APP_URL;
  }

  if (!hasValue(process.env.NEXTAUTH_URL)) {
    process.env.NEXTAUTH_URL = env.APP_URL;
  }
}
