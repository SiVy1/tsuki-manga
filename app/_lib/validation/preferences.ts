import { ReadingMode, ThemeMode } from "@/generated/prisma/client";
import { z } from "zod";

export const saveReadingModePreferenceInputSchema = z.object({
  readingMode: z.nativeEnum(ReadingMode),
});

export const saveThemePreferenceInputSchema = z.object({
  themeMode: z.nativeEnum(ThemeMode),
});
