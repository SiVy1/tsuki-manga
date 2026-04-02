import { describe, expect, it } from "vitest";

import {
  resolveServerThemeSnapshot,
  resolveThemeSnapshot,
  syncStoredThemeMode,
} from "@/app/_lib/theme/client";
import { resolveThemeMode } from "@/app/_lib/theme/shared";

describe("theme resolution", () => {
  it("falls back to system when no explicit preference exists", () => {
    expect(
      resolveThemeMode({
        systemPrefersDark: true,
      }),
    ).toEqual({
      mode: "SYSTEM",
      resolvedTheme: "dark",
    });
  });

  it("prefers account theme over local storage", () => {
    expect(
      resolveThemeMode({
        accountThemeMode: "LIGHT",
        storedThemeMode: "DARK",
        systemPrefersDark: true,
      }),
    ).toEqual({
      mode: "LIGHT",
      resolvedTheme: "light",
    });
  });

  it("uses local storage when account preference is absent", () => {
    expect(
      resolveThemeMode({
        storedThemeMode: "DARK",
        systemPrefersDark: false,
      }),
    ).toEqual({
      mode: "DARK",
      resolvedTheme: "dark",
    });
  });

  it("returns a stable snapshot reference for the same theme state", () => {
    const firstSnapshot = resolveThemeSnapshot("LIGHT");
    const secondSnapshot = resolveThemeSnapshot("LIGHT");

    expect(firstSnapshot).toBe(secondSnapshot);
    expect(firstSnapshot).toEqual({
      mode: "LIGHT",
      resolvedTheme: "light",
    });
  });

  it("prefers the locally stored mode for client snapshots", () => {
    const previousWindow = globalThis.window;
    const localStorageState = new Map<string, string>([["tsuki-theme-mode", "DARK"]]);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem(key: string) {
            return localStorageState.get(key) ?? null;
          },
          setItem(key: string, value: string) {
            localStorageState.set(key, value);
          },
        },
        matchMedia() {
          return {
            matches: false,
            addEventListener() {},
            removeEventListener() {},
          };
        },
      },
    });

    try {
      expect(resolveThemeSnapshot("LIGHT")).toEqual({
        mode: "DARK",
        resolvedTheme: "dark",
      });
    } finally {
      if (previousWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: previousWindow,
        });
      }
    }
  });

  it("uses the server fallback snapshot during hydration", () => {
    expect(resolveServerThemeSnapshot("SYSTEM")).toEqual({
      mode: "SYSTEM",
      resolvedTheme: "light",
    });

    expect(resolveServerThemeSnapshot("DARK")).toEqual({
      mode: "DARK",
      resolvedTheme: "dark",
    });
  });

  it("can overwrite a stale stored mode when the account preference should win", () => {
    const previousWindow = globalThis.window;
    const localStorageState = new Map<string, string>([["tsuki-theme-mode", "DARK"]]);

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem(key: string) {
            return localStorageState.get(key) ?? null;
          },
          setItem(key: string, value: string) {
            localStorageState.set(key, value);
          },
        },
        matchMedia() {
          return {
            matches: false,
            addEventListener() {},
            removeEventListener() {},
          };
        },
        addEventListener() {},
        removeEventListener() {},
      },
    });

    try {
      syncStoredThemeMode("LIGHT", true);
      expect(localStorageState.get("tsuki-theme-mode")).toBe("LIGHT");
    } finally {
      if (previousWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          configurable: true,
          value: previousWindow,
        });
      }
    }
  });
});
