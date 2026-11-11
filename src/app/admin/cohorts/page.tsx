import Link from "next/link";
import type { Metadata } from "next";
import { AdminEmpty, AdminHeader } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/auth";
import { getCohortTable } from "@/lib/queries";
import { updateCohortAction } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cohorts" };

export default async function AdminCohortsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/admin/cohorts", "cohorts");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const cohorts = await getCohortTable();

  return (
    <div className="space-y-8">
      <AdminHeader
        eyebrow="Cohorts"
        title="Classes and generations."
        description="Admission and graduation cohorts are created automatically when the first entry in that year is published. Give each one a title and a short introduction for its public page."
      />

      {error && (
        <div role="alert" className="border border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] px-4 py-3 text-[12px] text-[#9b2c2c]">
          {error}
        </div>
      )}

      {cohorts.length === 0 ? (
        <AdminEmpty title="No cohorts yet." body="They appear when the first entries are published." />
      ) : (
        <ul className="space-y-3">
          {cohorts.map((cohort) => (
            <li key={`${cohort.cohortType}:${cohort.year}`} className="border border-navy/15 bg-paper p-5">
              <form action={updateCohortAction} className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-start">
                <input type="hidden" name="year" value={cohort.year} />
                <input type="hidden" name="cohortType" value={cohort.cohortType} />
                <div>
                  <Link
                    href={`/classes/${cohort.cohortType}/${cohort.year}`}
                    className="display text-[1.25rem] leading-none hover:underline"
                  >
                    {cohort.cohortType === "admission" ? "Admitted" : "Graduating"} {cohort.year}
                  </Link>
                  <p className="mt-1 text-[10px] text-charcoal/40">{cohort.count} published</p>
                </div>
                <div className="space-y-2">
                  <input
                    name="label"
                    defaultValue={cohort.label ?? ""}
                    placeholder={cohort.cohortType === "admission" ? `Class of ${cohort.year}` : `Graduating Class of ${cohort.year}`}
                    maxLength={80}
                    className="w-full border border-navy/20 px-3 py-1.5 text-[12px] text-navy"
                  />
                  <textarea
                    name="introduction"
                    defaultValue={cohort.introduction ?? ""}
                    placeholder="Cohort introduction (optional)"
                    maxLength={1200}
                    rows={2}
                    className="w-full border border-navy/20 px-3 py-1.5 text-[12px] leading-relaxed text-navy"
                  />
                </div>
                <button type="submit" className="btn btn-ghost !px-4 !py-1.5 text-[10.5px] text-navy">
                  Save
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
