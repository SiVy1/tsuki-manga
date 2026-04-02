import { getEnv } from "@/app/_lib/settings/env";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: getEnv().APP_TIMEZONE,
});

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "n/a";
  }

  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

export function humanizeEnumValue(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
