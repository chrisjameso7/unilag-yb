import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { Empty } from "@/components/PageHero";
import { ProfileGrid } from "@/components/ProfileCard";
import { Pagination } from "@/components/Pagination";
import { getCohort, getFacultyTree, listPublicProfiles } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ type: string; year: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

function parse(type: string, year: string) {
  if ((type !== "admission" && type !== "graduation") || !/^\d{4}$/.test(year)) return null;
  return { type: type as "admission" | "graduation", year: Number(year) };
}

function heading(type: "admission" | "graduation", year: number) {
  return type === "graduation" ? `Graduating Class of ${year}` : `Class of ${year}`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await params;
  const parsed = parse(p.type, p.year);
  if (!parsed) return { title: "Class not found" };
  return {
    title: heading(parsed.type, parsed.year),
    description: `The UNILAG ${heading(parsed.type, parsed.year)} in the UNILAG Yearbook.`,
    alternates: { canonical: `/classes/${parsed.type}/${parsed.year}` },
  };
}

export default async function CohortPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const p = await params;
  const parsed = parse(p.type, p.year);
  if (!parsed) notFound();
  const sp = await searchParams;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const q = s(sp.q).slice(0, 80);
  const faculty = s(sp.faculty);
  const department = s(sp.department);
  const page = Math.max(1, Number.parseInt(s(sp.page) || "1", 10) || 1);

  const yearFilter = parsed.type === "admission" ? { admissionYear: parsed.year } : { graduationYear: parsed.year };
  const [cohort, tree, results] = await Promise.all([
    getCohort(parsed.type, parsed.year),
    getFacultyTree(),
    listPublicProfiles({ ...yearFilter, q: q || undefined, faculty: faculty || undefined, department: department || undefined, sort: "name", page, pageSize: 24 }),
  ]);
  if (cohort.count === 0) notFound();

  const base = `/classes/${parsed.type}/${parsed.year}`;
  const href = (n: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (faculty) u.set("faculty", faculty);
    if (department) u.set("department", department);
    if (n > 1) u.set("page", String(n));
    return u.toString() ? `${base}?${u}` : base;
  };

  return (
    <SiteShell>
      <section className="bg-navy text-ivory">
        <div className="container-page py-12 md:py-20">
          <Link href="/classes" className="eyebrow text-ivory/50 hover:text-ivory">← All classes</Link>
          <h1 className="display mt-4 text-[clamp(2.6rem,10vw,5.5rem)]">{cohort.label ?? heading(parsed.type, parsed.year)}</h1>
          <p className="mt-5 max-w-xl text-[1rem] leading-relaxed text-ivory/70">
            {cohort.introduction ??
              (parsed.type === "graduation"
                ? `The people who left UNILAG in ${parsed.year}.`
                : `The people who arrived at UNILAG in ${parsed.year}.`)}
          </p>
          <p className="eyebrow mt-6 text-ivory/45">{cohort.count} published {cohort.count === 1 ? "page" : "pages"}</p>
        </div>
      </section>

      <section className="container-page py-8 md:py-12">
        <form method="get" action={base} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]" role="search">
          <input name="q" type="search" defaultValue={q} placeholder={`Search the class`} aria-label="Search within this class" className="input" />
          <select name="faculty" defaultValue={faculty} aria-label="Faculty" className="input">
            <option value="">All faculties</option>
            {tree.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
          <select name="department" defaultValue={department} aria-label="Department" className="input">
            <option value="">All departments</option>
            {tree.map((f) => (
              <optgroup key={f.slug} label={f.name}>
                {f.departments.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
              </optgroup>
            ))}
          </select>
          <button type="submit" className="btn btn-dark">Filter</button>
        </form>

        <div className="mt-8">
          {results.items.length > 0 ? <ProfileGrid profiles={results.items} /> : <Empty title="No matches in this class." />}
        </div>
        <Pagination page={results.page} pageCount={results.pageCount} href={href} />
      </section>
    </SiteShell>
  );
}
