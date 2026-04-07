import { afterEach, describe, expect, it } from "vitest";

import { syncAuthEnvironmentFromAppUrl } from "@/app/_lib/auth/env";

const originalEnv = {
  APP_URL: process.env.APP_URL,
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (typeof value === "undefined") {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }
}

describe("auth environment sync", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("fills Auth.js URL vars from APP_URL when they are missing", () => {
    process.env.APP_URL = "https://manga.example";
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;

    syncAuthEnvironmentFromAppUrl();

    expect(process.env.AUTH_URL).toBe("https://manga.example");
    expect(process.env.NEXTAUTH_URL).toBe("https://manga.example");
  });

  it("does not override explicit Auth.js URL vars", () => {
    process.env.APP_URL = "https://manga.example";
    process.env.AUTH_URL = "https://auth.example";
    process.env.NEXTAUTH_URL = "https://legacy.example";

    syncAuthEnvironmentFromAppUrl();

    expect(process.env.AUTH_URL).toBe("https://auth.example");
    expect(process.env.NEXTAUTH_URL).toBe("https://legacy.example");
  });
});
