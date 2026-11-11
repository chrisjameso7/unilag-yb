import Link from "next/link";
import { AdminEmpty, AdminHeader, Pill } from "@/components/admin/AdminUI";
import { adminListStudents } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/students", "students");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const verification = typeof sp.verification === "string" ? sp.verification : undefined;
  const page = Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1;

  const result = await adminListStudents({ q, status, verification, page });

  function href(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (verification) params.set("verification", verification);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/admin/students?${qs}` : "/admin/students";
  }

  return (
    <div className="space-y-8">
      <AdminHeader
        eyebrow="Students"
        title="Every entry on file"
        description="Published, draft, awaiting payment, suspended and removed profiles — including students who have not finished their entry."
      />

      <form method="get" className="grid gap-2 border border-navy/15 bg-paper p-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, email or slug"
          className="input !py-2"
          aria-label="Search students"
        />
        <select name="status" defaultValue={status ?? ""} className="input !py-2 text-[12px]" aria-label="Publication status">
          <option value="">Any status</option>
          {["published", "draft", "pending_payment", "suspended", "removed"].map((value) => (
            <option key={value} value={value}>
              {value.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          name="verification"
          defaultValue={verification ?? ""}
          className="input !py-2 text-[12px]"
          aria-label="Verification status"
        >
          <option value="">Any verification</option>
          {["unverified", "pending", "verified", "rejected"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-dark !py-2 text-[11px]">
          Filter
        </button>
      </form>

      <div className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-[0.12em] text-charcoal/40">
          {result.total} {result.total === 1 ? "profile" : "profiles"}
        </p>
        <p className="text-[11px] text-charcoal/30">
          Page {result.page} of {result.pageCount}
        </p>
      </div>

      {result.items.length === 0 ? (
        <AdminEmpty title="No profiles match." body="Adjust the filters, or wait for students to start their entry." />
      ) : (
        <div className="overflow-x-auto border border-navy/15 bg-paper">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-navy/10 text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
                <th className="px-4 py-3 font-normal">Student</th>
                <th className="px-4 py-3 font-normal">Study</th>
                <th className="px-4 py-3 font-normal">Publication</th>
                <th className="px-4 py-3 font-normal">Verification</th>
                <th className="px-4 py-3 font-normal">Created</th>
                <th className="px-4 py-3 font-normal text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/[0.07]">
              {result.items.map((row) => (
                <tr key={String(row.id)} className="align-top transition-colors hover:bg-navy/[0.02]">
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] text-charcoal/85">{String(row.fullName)}</span>
                      {row.isDemo && <Pill status="none" label="demo" />}
                    </div>
                    <p className="mt-0.5 text-[10px] text-charcoal/40">{row.email ?? "Demonstration entry (no account)"}</p>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-charcoal/60">
                    <p>{String(row.departmentName)}</p>
                    <p className="mt-0.5 text-[10px] text-charcoal/35">
                      {String(row.facultyName)} · {String(row.admissionYear)}–{String(row.graduationYear)}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill status={String(row.publicationStatus)} />
                  </td>
                  <td className="px-4 py-3.5">
                    <Pill status={String(row.verificationStatus)} />
                  </td>
                  <td className="px-4 py-3.5 text-[10.5px] text-charcoal/45">
                    {formatDate(String(row.createdAt))}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/students/${String(row.id)}`}
                      className="text-[10px] uppercase tracking-[0.1em] text-green underline underline-offset-4"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-navy/10 pt-4">
          {result.page > 1 ? (
            <Link href={href(result.page - 1)} className="text-[11px] uppercase tracking-[0.12em] text-charcoal/55">
              ← Previous
            </Link>
          ) : (
            <span className="text-[11px] uppercase tracking-[0.12em] text-charcoal/20">← Previous</span>
          )}
          {result.page < result.pageCount ? (
            <Link href={href(result.page + 1)} className="text-[11px] uppercase tracking-[0.12em] text-charcoal/55">
              Next →
            </Link>
          ) : (
            <span className="text-[11px] uppercase tracking-[0.12em] text-charcoal/20">Next →</span>
          )}
        </div>
      )}
    </div>
  );
}
