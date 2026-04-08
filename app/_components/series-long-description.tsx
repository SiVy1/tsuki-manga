"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

type SeriesLongDescriptionProps = {
  description: string;
};

export function SeriesLongDescription({
  description,
}: SeriesLongDescriptionProps) {
  const t = useTranslations("SeriesLongDescription");
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();

  return (
    <section className="space-y-3">
      <div
        id={contentId}
        className={`overflow-hidden text-sm leading-8 text-muted ${
          expanded ? "" : "max-h-32"
        }`}
      >
        <p>{description}</p>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((current) => !current)}
        className="rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:border-foreground/20 hover:text-foreground"
      >
        {expanded ? t("collapse") : t("expand")}
      </button>
    </section>
  );
}
