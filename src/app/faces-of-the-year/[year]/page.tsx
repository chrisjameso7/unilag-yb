import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { Portrait } from "@/components/Portrait";
import { getPublishedEdition } from "@/lib/faces";

export const dynamic = "force-dynamic";

type Params = Promise<{ year: string }>;
const parseYear = (raw: string) => (/^\d{4}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const year = parseYear((await params).year);
  const data = year ? await getPublishedEdition(year) : null;
  if (!data) return { title: "Faces of the Year" };
  const image = data.edition.coverUrl ?? data.entries[0]?.portraitUrl;
  return {
    title: data.edition.title,
    description: `${data.edition.title} — every year has its faces. Every face has a story.`,
    alternates: { canonical: `/faces-of-the-year/${data.edition.year}` },
    openGraph: { title: `${data.edition.title} | UNILAG Yearbook`, images: image ? [{ url: image }] : undefined },
  };
}

export default async function EditionPage({ params }: { params: Params }) {
  const year = parseYear((await params).year);
  if (!year) notFound();
  const data = await getPublishedEdition(year);
  if (!data) notFound();
  const { edition, entries } = data;

  return (
    <SiteShell>
      <section className="bg-navy text-ivory">
        <div className="container-page py-12 md:py-20">
          <Link href="/faces-of-the-year" className="eyebrow text-ivory/50 hover:text-ivory">← Faces of the Year</Link>
          <h1 className="display mt-4 text-[clamp(2.8rem,11vw,6rem)]">{edition.title}</h1>
          <div className="mt-6 max-w-2xl space-y-4 text-[1rem] leading-relaxed text-ivory/70">
            {(edition.introduction || "Every year has its faces. Every face has a story.").split(/\n+/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <p className="eyebrow mt-6 text-ivory/45">{entries.length} {entries.length === 1 ? "face" : "faces"}</p>
        </div>
      </section>

      <section className="container-page py-12 md:py-20">
        {entries.length === 0 ? (
          <p className="text-charcoal/60">This edition is being prepared.</p>
        ) : (
          <ul className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map((e, i) => (
              <li key={e.id} id={e.slug} className="rise scroll-mt-24" style={{ animationDelay: `${(i % 6) * 60}ms` }}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-navy">
                  <Portrait name={e.fullName} src={e.portraitUrl} seed={e.slug} year={e.graduationYear} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" priority={i < 2} />
                </div>
                <h2 className="display mt-5 text-[1.9rem] leading-tight text-navy">{e.fullName}</h2>
                <p className="mt-1 text-[0.8rem] text-charcoal/55">
                  {e.departmentName} · {e.facultyName} · {e.admissionYear}–{e.graduationYear}
                </p>
                {e.quote && <blockquote className="display mt-4 border-l-2 border-green pl-4 text-[1.3rem] leading-snug text-charcoal/85">“{e.quote}”</blockquote>}
                {e.editorialIntroduction && <p className="mt-4 text-[0.92rem] leading-relaxed text-charcoal/70">{e.editorialIntroduction}</p>}
                <Link href={`/student/${e.slug}`} className="link mt-4 inline-block text-[0.85rem]">Yearbook page →</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteShell>
  );
}
