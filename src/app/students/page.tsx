import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero, Empty } from "@/components/PageHero";
import { ProfileGrid } from "@/components/ProfileCard";
import { Pagination } from "@/components/Pagination";
import { getFacultyTree, getYearFacets, listPublicProfiles, type ProfileFilters } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Students",
  description: "Search the UNILAG Yearbook by name, faculty, department, admission year or graduation year.",
  alternates: { canonical: "/students" },
};

type SP = Promise<Record<string, string | string[] | undefined>>;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const year = (v: string) => (/^\d{4}$/.test(v) ? Number(v) : undefined);

export default async function StudentsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = str(sp.q).slice(0, 80);
  const faculty = str(sp.faculty);
  const department = str(sp.department);
  const admission = str(sp.admission);
  const graduation = str(sp.graduation);
  const sort = (["recent", "name"].includes(str(sp.sort)) ? str(sp.sort) : "recent") as ProfileFilters["sort"];
  const page = Math.max(1, Number.parseInt(str(sp.page) || "1", 10) || 1);

  const [results, tree, years] = await Promise.all([
    listPublicProfiles({
      q: q || undefined,
      faculty: faculty || undefined,
      department: department || undefined,
      admissionYear: year(admission),
      graduationYear: year(graduation),
      sort,
      page,
      pageSize: 24,
    }),
    getFacultyTree(),
    getYearFacets(),
  ]);

  const activeFilters = [faculty, department, admission, graduation].filter(Boolean).length;
  const params = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, faculty, department, admission, graduation, sort })) if (v && !(k === "sort" && v === "recent")) u.set(k, v);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `/students?${s}` : "/students";
  };

  return (
    <SiteShell>
      <PageHero eyebrow="Students" title="Find your people.">
        Every published page in the yearbook. Search by name, or narrow by faculty, department and year.
      </PageHero>

      <section className="container-page py-8 md:py-12">
        <form method="get" action="/students" className="space-y-3" role="search">
          <div className="flex gap-2">
            <label htmlFor="q" className="sr-only">Search by name</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by name" className="input" autoComplete="off" enterKeyHint="search" />
            <button type="submit" className="btn btn-dark shrink-0">Search</button>
          </div>

          <details className="card group" open={activeFilters > 0}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[0.9rem] text-navy">
              <span>Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}</span>
              <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="grid gap-3 border-t border-navy/10 p-4 sm:grid-cols-2 lg:grid-cols-5">
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
              <select name="admission" defaultValue={admission} aria-label="Admission year" className="input">
                <option value="">Any admission year</option>
                {years.admission.map((y) => <option key={y} value={y}>Admitted {y}</option>)}
              </select>
              <select name="graduation" defaultValue={graduation} aria-label="Graduation year" className="input">
                <option value="">Any graduation year</option>
                {years.graduation.map((y) => <option key={y} value={y}>Class of {y}</option>)}
              </select>
              <select name="sort" defaultValue={sort} aria-label="Sort" className="input">
                <option value="recent">Recently added</option>
                <option value="name">Alphabetical</option>
              </select>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
                <button type="submit" className="btn btn-primary">Apply</button>
                {activeFilters > 0 && <Link href={q ? `/students?q=${encodeURIComponent(q)}` : "/students"} className="btn text-navy/60">Clear</Link>}
              </div>
            </div>
          </details>
        </form>

        <p className="mt-6 text-[0.8rem] text-charcoal/50" aria-live="polite">
          {results.total.toLocaleString("en-NG")} {results.total === 1 ? "page" : "pages"}
          {q ? ` matching “${q}”` : ""}
        </p>

        <div className="mt-6">
          {results.items.length > 0 ? (
            <ProfileGrid profiles={results.items} />
          ) : (
            <Empty title="No one here yet.">
              Try a different spelling or fewer filters — or{" "}
              <Link href="/join" className="link">add your own page</Link>.
            </Empty>
          )}
        </div>
        <Pagination page={results.page} pageCount={results.pageCount} href={params} />
      </section>
    </SiteShell>
  );
}
