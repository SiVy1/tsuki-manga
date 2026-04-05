export const savedSeriesStorageKey = "tsuki-saved-series";
export const savedSeriesChangedEvent = "tsuki-saved-series-changed";

export function parseSavedSeriesIds(rawValue: string | null | undefined) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function isSeriesSavedLocally(
  seriesId: string,
  rawValue: string | null | undefined,
) {
  return parseSavedSeriesIds(rawValue).includes(seriesId);
}

export function toggleSavedSeriesIds(
  seriesId: string,
  rawValue: string | null | undefined,
) {
  const currentIds = parseSavedSeriesIds(rawValue);
  const nextIds = currentIds.includes(seriesId)
    ? currentIds.filter((id) => id !== seriesId)
    : [...currentIds, seriesId];

  return {
    saved: nextIds.includes(seriesId),
    value: JSON.stringify(nextIds),
  };
}

export function resolveSavedSeriesSnapshot(seriesId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return isSeriesSavedLocally(seriesId, window.localStorage.getItem(savedSeriesStorageKey));
}

export function subscribeToSavedSeries(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(savedSeriesChangedEvent, handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(savedSeriesChangedEvent, handleStorage);
  };
}

export function notifySavedSeriesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(savedSeriesChangedEvent));
}
