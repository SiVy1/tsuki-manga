"use server";

import { ThemeMode } from "@/generated/prisma/client";

import { prisma } from "@/app/_lib/db/client";
import { requireSessionUser } from "@/app/_lib/auth/session";
import {
  saveReadingModePreferenceInputSchema,
  saveThemePreferenceInputSchema,
} from "@/app/_lib/validation/preferences";
import { fail, ok } from "@/app/_lib/utils/action-result";

export async function saveReadingModePreferenceAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = saveReadingModePreferenceInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid reading mode input.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      readingModePreference: parsed.data.readingMode,
    },
    select: {
      id: true,
      readingModePreference: true,
    },
  });

  return ok(updatedUser);
}

export async function saveThemePreferenceAction(rawInput: unknown) {
  const user = await requireSessionUser();
  const parsed = saveThemePreferenceInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid theme mode input.");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      themePreference: parsed.data.themeMode,
    },
    select: {
      id: true,
      themePreference: true,
    },
  });

  return ok({
    id: updatedUser.id,
    themePreference: updatedUser.themePreference ?? ThemeMode.SYSTEM,
  });
}
