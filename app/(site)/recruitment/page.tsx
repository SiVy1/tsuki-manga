import type { Metadata } from "next";

import { getSiteContent } from "@/app/_lib/content/site-content";
import { buildAbsoluteUrl } from "@/app/_lib/seo/public-url";

export async function generateMetadata(): Promise<Metadata> {
  const canonicalUrl = await buildAbsoluteUrl("recruitment");

  return {
    title: "Recruitment",
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function RecruitmentPage() {
  const content = await getSiteContent();

  return (
    <main className="shell flex-1 py-10 md:py-14">
      <section className="max-w-4xl space-y-10">
        <header className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Join the team</p>
          <h1 className="font-serif text-4xl md:text-5xl">{content.recruitment.title}</h1>
          <p className="text-sm leading-7 text-muted md:text-base">
            {content.recruitment.summary ?? "No public recruitment announcement is available right now."}
          </p>
        </header>

        {content.recruitment.enabled && content.recruitment.roles.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {content.recruitment.roles.map((role) => (
              <article
                key={role.title}
                className="space-y-3 border-t border-border/70 pt-4 md:pt-5"
              >
                <h2 className="font-serif text-2xl">{role.title}</h2>
                <p className="text-sm leading-7 text-muted">{role.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-muted">
            Recruitment is currently closed for this instance.
          </p>
        )}

        {content.recruitment.enabled && content.recruitment.contact ? (
          <section className="max-w-2xl space-y-2 border-t border-border/70 pt-6">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Contact</p>
            <h2 className="font-serif text-2xl">{content.recruitment.contact.label}</h2>
            <p className="text-sm leading-7 text-muted">{content.recruitment.contact.value}</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
