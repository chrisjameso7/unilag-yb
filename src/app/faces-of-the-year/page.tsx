import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { Portrait } from "@/components/Portrait";
import { getOpenEdition, getPublishedEdition, listPublishedEditions } from "@/lib/faces";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Faces of the Year",
  description: "BE PART OF THE FRAME. The annual editorial collection of the UNILAG Yearbook — curated, never voted on, never paid for.",
  alternates: { canonical: "/faces-of-the-year" },
};

const STEPS = [
  ["Opt in", "Tick the Faces box on your profile, or submit from this page."],
  ["Send a portrait", "Your phone is enough — the portrait guide shows how."],
  ["Editorial review", "Editors read every submission and may ask for another photo."],
  ["You approve", "If selected, you approve the final portrait and words before anything is published."],
];

export default async function FacesPage() {
  const [editions, open] = await Promise.all([listPublishedEditions(), getOpenEdition()]);
  const latest = editions[0] ? await getPublishedEdition(editions[0].year) : null;

  return (
    <SiteShell>
      <section className="bg-navy text-ivory">
        <div className="container-page py-14 md:py-24">
          <p className="eyebrow text-ivory/50">Faces of the Year</p>
          <h1 className="display mt-4 text-[clamp(3rem,13vw,7rem)]">BE PART OF THE FRAME.</h1>
          <p className="display mt-6 max-w-lg text-[clamp(1.4rem,4.5vw,2rem)] leading-[1.2] text-ivory/85">
            Every year has its faces. Every face has a story.
          </p>
          <p className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-ivory/65">
            You don&apos;t have to be famous or exceptional to deserve a place in the yearbook. You were here. That is enough.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {open ? (
              <Link href="/faces-of-the-year/submit" className="btn btn-primary">Submit for {open.title}</Link>
            ) : (
              <span className="btn btn-ghost pointer-events-none text-ivory/60">Submissions are closed for now</span>
            )}
            <Link href="/portrait-guide" className="btn btn-ghost text-ivory">Portrait guide</Link>
          </div>
        </div>
      </section>

      {latest && latest.entries.length > 0 && (
        <section className="container-page py-14 md:py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="display text-[clamp(2rem,6vw,3.4rem)] text-navy">{latest.edition.title}</h2>
            <Link href={`/faces-of-the-year/${latest.edition.year}`} className="link shrink-0 text-[0.875rem]">Full edition</Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {latest.entries.slice(0, 8).map((e, i) => (
              <li key={e.id} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
                <Link href={`/faces-of-the-year/${e.editionYear}#${e.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-navy">
                    <Portrait name={e.fullName} src={e.portraitUrl} seed={e.slug} year={e.graduationYear} />
                  </div>
                  <p className="display mt-3 text-[1.25rem] leading-tight text-navy group-hover:text-green">{e.fullName}</p>
                  <p className="text-[0.75rem] text-charcoal/55">{e.departmentName}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-ivory-deep">
        <div className="container-page grid gap-10 py-14 md:grid-cols-[0.8fr_1.2fr] md:py-20">
          <div>
            <p className="eyebrow text-green">How it works</p>
            <h2 className="display mt-3 text-[clamp(2rem,6vw,3rem)] text-navy">Curated, not competed for.</h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-charcoal/65">
              No public voting, no rankings, no paid placement. Selection never depends on wealth, looks, social following or ability to pay.
              Editors look for range across faculties, departments and generations. Taking part is optional and free — your ordinary yearbook page never depends on it.
            </p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="card p-5">
                <span className="eyebrow text-charcoal/40">0{i + 1}</span>
                <p className="display mt-2 text-[1.35rem] text-navy">{t}</p>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-charcoal/60">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {editions.length > 0 && (
        <section className="container-page py-14">
          <h2 className="display text-[1.9rem] text-navy">Every edition</h2>
          <ul className="mt-6 divide-y divide-navy/10 border-y border-navy/10">
            {editions.map((e) => (
              <li key={e.id}>
                <Link href={`/faces-of-the-year/${e.year}`} className="group flex items-center justify-between py-4">
                  <span className="display text-[1.8rem] text-navy group-hover:text-green">{e.title}</span>
                  <span className="text-charcoal/40">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </SiteShell>
  );
}
