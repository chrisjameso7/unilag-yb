import Link from "next/link";
import type { Metadata } from "next";
import { AdminEmpty, AdminHeader, Pill } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/auth";
import { adminListEditions } from "@/lib/faces";
import { createEditionAction } from "@/lib/actions/faces";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Faces of the Year" };

export default async function AdminFacesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/admin/faces", "faces");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const editions = await adminListEditions();
  const nextYear = Math.max(new Date().getFullYear(), ...editions.map((e) => e.year + 1));

  return (
    <div className="space-y-8">
      <AdminHeader
        eyebrow="Editorial"
        title="Faces of the Year."
        description="Annual editions. Selection considers representation across faculties, departments and generations, portrait quality and consent — never wealth, appearance, social following or ability to pay."
      />

      {error && (
        <div role="alert" className="border border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] px-4 py-3 text-[12px] text-[#9b2c2c]">
          {error}
        </div>
      )}

      {editions.length === 0 ? (
        <AdminEmpty title="No editions yet." body="Create the first edition below, then open submissions." />
      ) : (
        <ul className="border-t border-navy/15">
          {editions.map((edition) => (
            <li key={edition.id}>
              <Link
                href={`/admin/faces/${edition.year}`}
                className="grid grid-cols-[5rem_1fr_auto] items-center gap-4 border-b border-navy/10 py-4 hover:bg-navy/[0.025]"
              >
                <span className="display text-[1.9rem] leading-none">{edition.year}</span>
                <span>
                  <span className="block text-[13px] text-charcoal/80">{edition.title}</span>
                  <span className="mt-1 block text-[10.5px] text-charcoal/40">
                    {edition.submissions} submissions · {edition.openSubmissions} awaiting review ·{" "}
                    {edition.publishedEntries}/{edition.entries} entries live
                  </span>
                </span>
                <span className="flex gap-2">
                  {edition.submissionsOpen && <Pill status="open" label="Submissions open" />}
                  <Pill
                    status={edition.publicationStatus === "published" ? "published" : edition.publicationStatus === "archived" ? "none" : "draft"}
                    label={edition.publicationStatus}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form action={createEditionAction} className="max-w-xl space-y-3 border border-navy/15 bg-paper p-5">
        <p className="eyebrow text-charcoal/40">New edition</p>
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <input
            name="year"
            type="number"
            min={2020}
            max={2100}
            defaultValue={nextYear}
            required
            aria-label="Year"
            className="border border-navy/20 px-3 py-2 text-[12.5px]"
          />
          <input
            name="title"
            defaultValue={`Faces of ${nextYear}`}
            required
            aria-label="Title"
            className="border border-navy/20 px-3 py-2 text-[12.5px]"
          />
        </div>
        <textarea
          name="introduction"
          rows={3}
          placeholder="Editorial introduction (can be written later)"
          className="w-full border border-navy/20 px-3 py-2 text-[12.5px] leading-relaxed"
        />
        <button type="submit" className="btn btn-primary !px-4 !py-2 text-[11px]">
          Create edition
        </button>
      </form>
    </div>
  );
}
