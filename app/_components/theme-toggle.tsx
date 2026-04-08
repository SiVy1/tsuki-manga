"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useSyncExternalStore, useTransition } from "react";

import {
  resolveServerThemeSnapshot,
  resolveThemeSnapshot,
  setStoredThemeMode,
  subscribeToTheme,
} from "@/app/_lib/theme/client";
import { themeModes, type ThemeModeValue } from "@/app/_lib/theme/shared";

const themeModeDetails: Record<ThemeModeValue, {
  label: string;
  description: string;
  icon: ReactNode;
}> = {
  SYSTEM: {
    label: "System",
    description: "Follow the device theme",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2.25" y="2.5" width="11.5" height="8.5" rx="1.75" />
        <path d="M6 13.5h4" />
        <path d="M8 11v2.5" />
      </svg>
    ),
  },
  LIGHT: {
    label: "Light",
    description: "Keep the calm paper-like palette",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="8" cy="8" r="2.5" />
        <path d="M8 1.75v1.5" />
        <path d="M8 12.75v1.5" />
        <path d="M1.75 8h1.5" />
        <path d="M12.75 8h1.5" />
        <path d="m3.6 3.6 1.05 1.05" />
        <path d="m11.35 11.35 1.05 1.05" />
        <path d="m11.35 4.65 1.05-1.05" />
        <path d="M3.6 12.4 4.65 11.35" />
      </svg>
    ),
  },
  DARK: {
    label: "Dark",
    description: "Use the warm night reading palette",
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5"
        fill="currentColor"
      >
        <path d="M9.54 1.37a.7.7 0 0 1 .82.8 5.44 5.44 0 0 0 5.48 6.34.7.7 0 0 1 .52 1.17A7.21 7.21 0 1 1 9.54 1.37Z" />
      </svg>
    ),
  },
};

type ThemeToggleProps = {
  defaultThemeMode: ThemeModeValue;
  onPersistThemeMode?: (input: { themeMode: ThemeModeValue }) => Promise<unknown>;
};

export function ThemeToggle({
  defaultThemeMode,
  onPersistThemeMode,
}: ThemeToggleProps) {
  const t = useTranslations("Common.theme");
  const themeState = useSyncExternalStore(
    subscribeToTheme,
    () => resolveThemeSnapshot(defaultThemeMode),
    () => resolveServerThemeSnapshot(defaultThemeMode),
  );
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("groupLabel")}
      className="flex items-center gap-0.5"
    >
      {themeModes.map((mode) => {
        const details = themeModeDetails[mode];
        const label = t(mode.toLowerCase());
        const description = t(`${mode.toLowerCase()}Description`);

        return (
          <button
            key={mode}
            type="button"
            onClick={() => {
              setStoredThemeMode(mode);

              if (onPersistThemeMode) {
                startTransition(async () => {
                  await onPersistThemeMode({
                    themeMode: mode,
                  });
                });
              }
            }}
            title={description}
            aria-label={label}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
              themeState.mode === mode
                ? "bg-[var(--surface-hover)] text-foreground"
                : "text-muted hover:bg-[var(--surface-hover)] hover:text-foreground"
            }`}
            aria-pressed={themeState.mode === mode}
            disabled={isPending}
          >
            <span className="shrink-0">{details.icon}</span>
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
