"use client";

import {
  isThemeMode,
  resolveThemeMode,
  themeModeStorageKey,
  type ResolvedTheme,
  type ThemeModeValue,
} from "@/app/_lib/theme/shared";

const themeListeners = new Set<() => void>();
const themeSnapshots: Record<ThemeModeValue, Record<ResolvedTheme, {
  mode: ThemeModeValue;
  resolvedTheme: ResolvedTheme;
}>> = {
  SYSTEM: {
    light: {
      mode: "SYSTEM",
      resolvedTheme: "light",
    },
    dark: {
      mode: "SYSTEM",
      resolvedTheme: "dark",
    },
  },
  LIGHT: {
    light: {
      mode: "LIGHT",
      resolvedTheme: "light",
    },
    dark: {
      mode: "LIGHT",
      resolvedTheme: "dark",
    },
  },
  DARK: {
    light: {
      mode: "DARK",
      resolvedTheme: "light",
    },
    dark: {
      mode: "DARK",
      resolvedTheme: "dark",
    },
  },
};

function getThemeSnapshot(mode: ThemeModeValue, resolvedTheme: ResolvedTheme) {
  return themeSnapshots[mode][resolvedTheme];
}

function getThemeMediaQuery() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.matchMedia("(prefers-color-scheme: dark)");
}

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

function handleExternalThemeChange() {
  notifyThemeListeners();
}

export function getStoredThemeMode() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(themeModeStorageKey);
  return isThemeMode(value) ? value : null;
}

export function getSystemPrefersDark() {
  return getThemeMediaQuery()?.matches ?? false;
}

export function resolveThemeSnapshot(defaultThemeMode: ThemeModeValue) {
  const storedThemeMode = getStoredThemeMode();
  const { mode, resolvedTheme } = resolveThemeMode({
    accountThemeMode: storedThemeMode ? null : defaultThemeMode,
    storedThemeMode,
    systemPrefersDark: getSystemPrefersDark(),
  });

  return getThemeSnapshot(mode, resolvedTheme);
}

export function resolveServerThemeSnapshot(defaultThemeMode: ThemeModeValue) {
  const { mode, resolvedTheme } = resolveThemeMode({
    accountThemeMode: defaultThemeMode,
    storedThemeMode: null,
    systemPrefersDark: false,
  });

  return getThemeSnapshot(mode, resolvedTheme);
}

export function applyResolvedTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function setStoredThemeMode(themeMode: ThemeModeValue) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(themeModeStorageKey, themeMode);
  notifyThemeListeners();
}

export function syncStoredThemeMode(
  themeMode: ThemeModeValue | null | undefined,
  overwriteExisting = false,
) {
  if (!themeMode || typeof window === "undefined") {
    return;
  }

  const currentThemeMode = getStoredThemeMode();

  if (overwriteExisting || currentThemeMode === null) {
    window.localStorage.setItem(themeModeStorageKey, themeMode);
    notifyThemeListeners();
  }
}

export function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);

  if (themeListeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleExternalThemeChange);
    getThemeMediaQuery()?.addEventListener("change", handleExternalThemeChange);
  }

  return () => {
    themeListeners.delete(listener);

    if (themeListeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleExternalThemeChange);
      getThemeMediaQuery()?.removeEventListener("change", handleExternalThemeChange);
    }
  };
}
