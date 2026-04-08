"use server";

import { cookies } from "next/headers";

import { defaultLocale, localeCookieName, locales, type AppLocale } from "@/i18n/config";
import { fail, ok } from "@/app/_lib/utils/action-result";

export async function setLocaleAction(rawInput: unknown) {
  const locale =
    typeof rawInput === "object" &&
    rawInput !== null &&
    "locale" in rawInput &&
    typeof rawInput.locale === "string"
      ? rawInput.locale
      : null;

  if (!locale || !locales.includes(locale as AppLocale)) {
    return fail("Invalid locale.");
  }

  const cookieStore = await cookies();

  if (locale === defaultLocale) {
    cookieStore.delete(localeCookieName);
  } else {
    cookieStore.set(localeCookieName, locale, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return ok({
    locale,
  });
}
