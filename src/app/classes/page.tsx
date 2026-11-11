import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero, Empty } from "@/components/PageHero";
import { getCohorts, type CohortSummary } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Classes",
  description: "Explore UNILAG generations by admission cohort and graduating class.",
  alternates: { canonical: "/classes" },
};

function CohortList({ cohorts, type }: { cohorts: CohortSummary[]; type: "admission" | "graduation" }) {
  if (cohorts.length === 0) return <Empty title="No classes yet.">They appear as soon as the first pages are published.</Empty>;
  return (
    <ul className="divide-y divide-navy/10 border-y border-navy/10">
      {cohorts.map((c) => (
        <li key={c.year}>
          <Link href={`/classes/${type}/${c.year}`} className="group flex items-center justify-between gap-4 py-4">
            <span>
              <span className="display block text-[1.9rem] leading-none text-navy group-hover:text-green">
                {type === "graduation" ? `Graduating Class of ${c.year}` : `Class of ${c.year}`}
              </span>
              <span className="mt-1.5 block line-clamp-1 text-[0.78rem] text-charcoal/45">{c.sample.map((s) => s.fullName).join(" · ")}</span>
            </span>
            <span className="shrink-0 text-[0.8rem] text-charcoal/50">{c.count} →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ClassesPage() {
  const cohorts = await getCohorts();
  return (
    <SiteShell>
      <PageHero eyebrow="Classes" title="Every generation leaves something behind.">
        The year you arrived isn&apos;t always the year you left, so the archive keeps both: the class you were admitted with, and the class you graduate with.
      </PageHero>
      <section className="container-page grid gap-14 py-12 md:py-16 lg:grid-cols-2">
        <div>
          <h2 className="display text-[2rem] text-navy">Graduating classes</h2>
          <p className="mb-6 mt-2 text-[0.9rem] text-charcoal/55">The class you leave with.</p>
          <CohortList cohorts={cohorts.graduation} type="graduation" />
        </div>
        <div>
          <h2 className="display text-[2rem] text-navy">Admission cohorts</h2>
          <p className="mb-6 mt-2 text-[0.9rem] text-charcoal/55">The class you started with.</p>
          <CohortList cohorts={cohorts.admission} type="admission" />
        </div>
      </section>
    </SiteShell>
  );
}
