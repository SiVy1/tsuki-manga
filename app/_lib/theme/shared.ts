export const themeModes = ["SYSTEM", "LIGHT", "DARK"] as const;

export type ThemeModeValue = (typeof themeModes)[number];
export type ResolvedTheme = "light" | "dark";

export const themeModeStorageKey = "tsuki-theme-mode";

export function isThemeMode(value: unknown): value is ThemeModeValue {
  return typeof value === "string" && themeModes.includes(value as ThemeModeValue);
}

export function resolveThemeMode(input: {
  accountThemeMode?: ThemeModeValue | null;
  storedThemeMode?: ThemeModeValue | null;
  systemPrefersDark: boolean;
}) {
  const mode =
    input.accountThemeMode ??
    input.storedThemeMode ??
    "SYSTEM";

  return {
    mode,
    resolvedTheme: mode === "DARK" || (mode === "SYSTEM" && input.systemPrefersDark)
      ? "dark"
      : "light",
  } satisfies {
    mode: ThemeModeValue;
    resolvedTheme: ResolvedTheme;
  };
}
