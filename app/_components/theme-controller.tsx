"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  applyResolvedTheme,
  resolveServerThemeSnapshot,
  resolveThemeSnapshot,
  subscribeToTheme,
  syncStoredThemeMode,
} from "@/app/_lib/theme/client";
import type { ThemeModeValue } from "@/app/_lib/theme/shared";

type ThemeControllerProps = {
  defaultThemeMode: ThemeModeValue;
  persistAccountTheme?: boolean;
};

export function ThemeController({
  defaultThemeMode,
  persistAccountTheme = false,
}: ThemeControllerProps) {
  const themeState = useSyncExternalStore(
    subscribeToTheme,
    () => resolveThemeSnapshot(defaultThemeMode),
    () => resolveServerThemeSnapshot(defaultThemeMode),
  );

  useEffect(() => {
    syncStoredThemeMode(defaultThemeMode, persistAccountTheme);
  }, [defaultThemeMode, persistAccountTheme]);

  useEffect(() => {
    applyResolvedTheme(themeState.resolvedTheme);
  }, [themeState.resolvedTheme]);

  return null;
}
