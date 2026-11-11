import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { Portrait } from "@/components/Portrait";
import { ProfileGrid } from "@/components/ProfileCard";
import { getArchiveStats, getCohorts, listPublicProfiles } from "@/lib/queries";
import { listPublishedEditions } from "@/lib/faces";
import { getEntryFeeKobo } from "@/lib/content";
import { formatNaira } from "@/lib/format";

// Rendered per request: the archive reads live data (and the header knows who is signed in).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [recent, stats, cohorts, editions, fee] = await Promise.all([
    listPublicProfiles({ pageSize: 8, sort: "recent" }),
    getArchiveStats(),
    getCohorts(),
    listPublishedEditions(),
    getEntryFeeKobo(),
  ]);
  const mosaic = recent.items.slice(0, 5);
  const latestFaces = editions[0] ?? null;
  const classes = cohorts.graduation.slice(0, 5);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="overflow-hidden bg-navy text-ivory">
        <div className="container-page grid gap-10 py-12 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="rise">
            <p className="eyebrow text-ivory/50">The UNILAG Yearbook</p>
            <h1 className="display mt-5 text-[clamp(2.9rem,11vw,6.2rem)]">
              Somewhere in the story of UNILAG, <em className="text-[#7fd1ad]">there&apos;s you.</em>
            </h1>
            <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-ivory/70">
              Every generation leaves something behind. Create your page, find your people and become part of the UNILAG story.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/join" className="btn btn-primary">Join the Yearbook</Link>
              <Link href="/students" className="btn btn-ghost text-ivory">Explore the Yearbook</Link>
            </div>
          </div>

          {mosaic.length >= 3 ? (
            <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Recently added students">
              {mosaic.slice(0, 3).map((p, i) => (
                <li key={p.id} className={`rise relative aspect-[3/4] overflow-hidden rounded-2xl ${i === 1 ? "translate-y-6" : ""}`} style={{ animationDelay: `${150 + i * 90}ms` }}>
                  <Link href={`/student/${p.slug}`} aria-label={p.fullName}>
                    <Portrait name={p.fullName} src={p.portraitPath} seed={p.slug} year={p.graduationYear} sizes="(max-width: 1024px) 33vw, 15vw" priority />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      {/* The yearbook */}
      <section className="container-page grid gap-8 py-16 md:grid-cols-2 md:py-24">
        <div>
          <p className="eyebrow text-green">The yearbook</p>
          <h2 className="display mt-4 text-[clamp(2.2rem,6vw,3.6rem)] text-navy">A permanent page for everyone who was here.</h2>
        </div>
        <div className="space-y-5 text-[1rem] leading-relaxed text-charcoal/70 md:pt-10">
          <p>
            Thousands of people walk through the gates at Akoka every year. They make friends, miss lectures, discover themselves — and eventually move on.
            The yearbook keeps a little piece of those years, for good.
          </p>
          <dl className="grid grid-cols-3 gap-4 border-t border-navy/10 pt-5">
            {[
              [stats.published.toLocaleString("en-NG"), "pages"],
              [stats.classes.toLocaleString("en-NG"), "classes"],
              [stats.faculties.toLocaleString("en-NG"), "faculties"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="display text-[2.2rem] leading-none text-navy">{value}</dd>
                <dd className="mt-1 text-[0.75rem] text-charcoal/50">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Faces of the Year */}
      <section className="bg-ivory-deep">
        <div className="container-page grid gap-8 py-16 md:grid-cols-[1fr_1fr] md:items-end md:py-20">
          <div>
            <p className="eyebrow text-green">Faces of the Year</p>
            <h2 className="display mt-4 text-[clamp(2.4rem,8vw,4.6rem)] text-navy">BE PART OF THE FRAME.</h2>
          </div>
          <div>
            <p className="text-[1rem] leading-relaxed text-charcoal/70">
              Every year has its faces. Every face has a story. Our annual editorial collection is curated — never voted on, never paid for.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={latestFaces ? `/faces-of-the-year/${latestFaces.year}` : "/faces-of-the-year"} className="btn btn-dark">
                {latestFaces ? `See ${latestFaces.title}` : "About Faces of the Year"}
              </Link>
              <Link href="/portrait-guide" className="btn btn-ghost text-navy">Portrait guide</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Explore students */}
      <section className="container-page py-16 md:py-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-green">Explore students</p>
            <h2 className="display mt-3 text-[clamp(2rem,6vw,3.2rem)] text-navy">Recently added</h2>
          </div>
          <Link href="/students" className="link shrink-0 text-[0.875rem]">See all</Link>
        </div>
        <div className="mt-8">
          {recent.items.length > 0 ? (
            <ProfileGrid profiles={recent.items} />
          ) : (
            <p className="text-charcoal/60">The first pages are on their way. Yours could be one of them.</p>
          )}
        </div>
      </section>

      {/* Browse classes */}
      {classes.length > 0 && (
        <section className="border-t border-navy/10">
          <div className="container-page py-16 md:py-20">
            <p className="eyebrow text-green">Browse classes</p>
            <h2 className="display mt-3 text-[clamp(2rem,6vw,3.2rem)] text-navy">Every generation</h2>
            <ul className="mt-8 divide-y divide-navy/10 border-y border-navy/10">
              {classes.map((c) => (
                <li key={c.year}>
                  <Link href={`/classes/graduation/${c.year}`} className="group flex items-center justify-between gap-4 py-4">
                    <span className="display text-[2rem] text-navy group-hover:text-green">Class of {c.year}</span>
                    <span className="text-[0.8rem] text-charcoal/50">{c.count} {c.count === 1 ? "page" : "pages"} →</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/classes" className="link mt-6 inline-block text-[0.875rem]">All admission and graduation classes</Link>
          </div>
        </section>
      )}

      {/* The story + join */}
      <section className="bg-navy text-ivory">
        <div className="container-page grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="eyebrow text-ivory/50">The story</p>
            <p className="display mt-4 text-[clamp(1.9rem,5vw,3rem)] leading-[1.08]">
              Someone who creates a page in 2026 should be able to come back in 2046 and find it — and the people they shared those years with.
            </p>
          </div>
          <div className="md:pt-12">
            <ul className="space-y-3 text-[0.95rem] text-ivory/75">
              <li>✓ Verified UNILAG students only</li>
              <li>✓ One payment of {formatNaira(fee)} — no subscriptions, no hidden charges</li>
              <li>✓ Edit your page for life, free</li>
              <li>✓ No likes, followers or rankings. Just the record.</li>
            </ul>
            <Link href="/join" className="btn btn-primary mt-8 w-full sm:w-auto">Join the Yearbook</Link>
            <p className="mt-4 text-[0.8rem] text-ivory/45">
              Everyone gets a page. Some get a feature. Every generation leaves something behind.
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
