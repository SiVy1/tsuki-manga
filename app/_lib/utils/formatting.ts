import { getEnv } from "@/app/_lib/settings/env";
import { defaultLocale } from "@/i18n/config";

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function resolveDateFormatter(locale: string) {
  const existing = dateFormatters.get(locale);

  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: getEnv().APP_TIMEZONE,
  });

  dateFormatters.set(locale, formatter);

  return formatter;
}

export function formatDateTime(
  value: Date | string | null | undefined,
  locale: string = defaultLocale,
) {
  if (!value) {
    return "n/a";
  }

  return resolveDateFormatter(locale).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function humanizeEnumValue(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
