import type { AppEnv } from "@/app/_lib/settings/env";

export function isTestAuthEnabled(env: AppEnv) {
  if (!env.ENABLE_TEST_AUTH) {
    return false;
  }

  if (env.NODE_ENV !== "production") {
    return true;
  }

  return env.ALLOW_TEST_AUTH_IN_PRODUCTION;
}
