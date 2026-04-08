import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { defaultLocale, localeCookieName, locales, type AppLocale } from "@/i18n/config";
import enMessages from "@/messages/en.json";
import plMessages from "@/messages/pl.json";

const messageMap: Record<AppLocale, typeof enMessages> = {
  en: enMessages,
  pl: plMessages,
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get(localeCookieName)?.value;
  const locale = locales.includes(requestedLocale as AppLocale)
    ? (requestedLocale as AppLocale)
    : defaultLocale;

  return {
    locale,
    messages: messageMap[locale],
  };
});
