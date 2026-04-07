import type { Metadata } from "next";

import { getSiteContent } from "@/app/_lib/content/site-content";
import { buildAbsoluteUrl } from "@/app/_lib/seo/public-url";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await buildAbsoluteUrl("rules");

  return {
    title: "Community rules",
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function RulesPage() {
  const content = await getSiteContent();

  return (
    <main className="shell flex-1 py-10 md:py-14">
      <section className="max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Public info</p>
          <h1 className="font-serif text-4xl md:text-5xl">{content.rules.title}</h1>
          {content.rules.updatedAt ? (
            <p className="text-sm text-muted">Updated {content.rules.updatedAt}</p>
          ) : null}
        </header>

        {content.rules.enabled && content.rules.items.length ? (
          <ol className="space-y-4">
            {content.rules.items.map((item, index) => (
              <li
                key={`${index}-${item}`}
                className="flex gap-4 border-t border-border/70 py-4 first:border-t-0 first:pt-0"
              >
                <span className="pt-0.5 text-sm text-muted">{String(index + 1).padStart(2, "0")}</span>
                <p className="text-sm leading-7 text-foreground/90 md:text-[0.98rem]">
                  {item}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm leading-7 text-muted">
            No public rules have been published for this instance yet.
          </p>
        )}
      </section>
    </main>
  );
}
