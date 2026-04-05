import { describe, expect, it } from "vitest";

import {
  isSeriesSavedLocally,
  parseSavedSeriesIds,
  toggleSavedSeriesIds,
} from "@/app/_lib/library/client";

describe("saved series local helpers", () => {
  it("returns an empty list for invalid payloads", () => {
    expect(parseSavedSeriesIds(null)).toEqual([]);
    expect(parseSavedSeriesIds("")).toEqual([]);
    expect(parseSavedSeriesIds("{")).toEqual([]);
    expect(parseSavedSeriesIds("{\"seriesId\":\"abc\"}")).toEqual([]);
  });

  it("filters out non-string values", () => {
    expect(parseSavedSeriesIds(JSON.stringify(["series-1", 2, null, "series-2"]))).toEqual([
      "series-1",
      "series-2",
    ]);
  });

  it("checks whether a series is saved locally", () => {
    const payload = JSON.stringify(["series-1", "series-2"]);

    expect(isSeriesSavedLocally("series-1", payload)).toBe(true);
    expect(isSeriesSavedLocally("series-3", payload)).toBe(false);
  });

  it("toggles a series on and off", () => {
    const saved = toggleSavedSeriesIds("series-2", JSON.stringify(["series-1"]));

    expect(saved.saved).toBe(true);
    expect(saved.value).toBe(JSON.stringify(["series-1", "series-2"]));

    const removed = toggleSavedSeriesIds("series-1", saved.value);

    expect(removed.saved).toBe(false);
    expect(removed.value).toBe(JSON.stringify(["series-2"]));
  });
});
