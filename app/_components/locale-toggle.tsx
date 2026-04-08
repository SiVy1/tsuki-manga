"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { setLocaleAction } from "@/app/_actions/i18n/actions";
import { locales, type AppLocale } from "@/i18n/config";

export function LocaleToggle() {
  const t = useTranslations("LocaleToggle");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("groupLabel")}
      className="flex items-center gap-1 rounded-full border border-border px-1 py-1"
    >
      {locales.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            if (option === locale) {
              return;
            }

            startTransition(async () => {
              const result = await setLocaleAction({ locale: option });

              if (result.success) {
                router.refresh();
              }
            });
          }}
          className={`rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] transition ${
            locale === option
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          }`}
          aria-pressed={locale === option}
          disabled={isPending}
        >
          {t(`options.${option}`)}
        </button>
      ))}
    </div>
  );
}
