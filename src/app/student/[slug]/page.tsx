import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { Portrait } from "@/components/Portrait";
import { ShareButtons } from "@/components/ShareButtons";
import { getPublicProfileBySlug, getPublishedNeighbours } from "@/lib/queries";
import { getFacesFeaturesForProfile } from "@/lib/faces";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const profile = await getPublicProfileBySlug((await params).slug);
  if (!profile) return { title: "Page not found", robots: { index: false } };
  const description = `A member of the UNILAG Class of ${profile.graduationYear}. Explore their yearbook profile.`;
  return {
    title: profile.fullName,
    description,
    alternates: { canonical: `/student/${profile.slug}` },
    openGraph: { title: `${profile.fullName} | UNILAG Yearbook`, description, type: "profile", url: `/student/${profile.slug}` },
    // Students choose whether search engines may index their page (plan §14).
    robots: profile.searchIndexing && !profile.isDemo ? undefined : { index: false, follow: true },
  };
}

export default async function StudentPage({ params }: { params: Params }) {
  const profile = await getPublicProfileBySlug((await params).slug);
  if (!profile) notFound();
  const [neighbours, facesYears] = await Promise.all([getPublishedNeighbours(profile), getFacesFeaturesForProfile(profile.id)]);

  const facts = [
    ["Faculty", profile.facultyName],
    ["Department", profile.departmentName],
    ["Admitted", String(profile.admissionYear)],
    [profile.graduationStatus === "graduated" ? "Graduated" : "Graduating", String(profile.graduationYear)],
  ];

  return (
    <SiteShell>
      <article className="container-page grid gap-8 py-6 md:grid-cols-[0.9fr_1.1fr] md:gap-14 md:py-14">
        <div className="rise">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-navy">
            <Portrait name={profile.fullName} src={profile.portraitPath} seed={profile.slug} year={profile.graduationYear} sizes="(max-width: 768px) 100vw, 45vw" priority />
          </div>
          <p className="mt-3 flex justify-between text-[0.7rem] uppercase tracking-[0.14em] text-charcoal/40">
            <span>{profile.publicIdentifier}</span>
            <span>Added {formatDate(profile.createdAt)}</span>
          </p>
        </div>

        <div className="rise md:pt-6" style={{ animationDelay: "90ms" }}>
          <nav aria-label="Breadcrumb" className="text-[0.75rem] text-charcoal/50">
            <Link href="/students" className="hover:text-navy">Students</Link>
            <span aria-hidden="true"> / </span>
            <Link href={`/classes/graduation/${profile.graduationYear}`} className="hover:text-navy">Class of {profile.graduationYear}</Link>
          </nav>
          <h1 className="display mt-4 text-[clamp(2.8rem,10vw,5.4rem)] text-navy">{profile.fullName}</h1>

          {facesYears.length > 0 && (
            <p className="mt-4 flex flex-wrap gap-2">
              {facesYears.map((y) => (
                <Link key={y} href={`/faces-of-the-year/${y}#${profile.slug}`} className="eyebrow rounded-full bg-green/10 px-3 py-1.5 text-green-deep">
                  Faces of {y}
                </Link>
              ))}
            </p>
          )}

          {profile.biography && (
            <p className="display mt-7 text-[clamp(1.4rem,4.5vw,2rem)] leading-[1.25] text-charcoal/85">“{profile.biography}”</p>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-navy/10 py-6">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="eyebrow text-charcoal/40">{label}</dt>
                <dd className="mt-1 text-[0.95rem] text-navy">{value}</dd>
              </div>
            ))}
          </dl>

          {profile.isDemo && (
            <p className="mt-6 rounded-xl border border-navy/15 bg-paper p-4 text-[0.8rem] leading-relaxed text-charcoal/60">
              A fictional demonstration entry showing how a yearbook page looks. Not a real student.
            </p>
          )}

          <div className="mt-8">
            <ShareButtons title={`${profile.fullName} — UNILAG Yearbook`} path={`/student/${profile.slug}`} />
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={`/classes/graduation/${profile.graduationYear}`} className="btn btn-dark">Explore the Class of {profile.graduationYear}</Link>
            <Link href="/join" className="btn btn-ghost text-navy">Create your own page</Link>
          </div>

          {(neighbours.previous || neighbours.next) && (
            <nav aria-label="More from this class" className="mt-10 grid grid-cols-2 gap-4 border-t border-navy/10 pt-6 text-[0.85rem]">
              {neighbours.previous ? (
                <Link href={`/student/${neighbours.previous.slug}`} className="text-charcoal/60 hover:text-navy">← {neighbours.previous.fullName}</Link>
              ) : <span />}
              {neighbours.next && (
                <Link href={`/student/${neighbours.next.slug}`} className="text-right text-charcoal/60 hover:text-navy">{neighbours.next.fullName} →</Link>
              )}
            </nav>
          )}
        </div>
      </article>
    </SiteShell>
  );
}
