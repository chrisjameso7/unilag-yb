import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/auth";
import { getContentMap } from "@/lib/content";
import { updateContentAction } from "@/lib/actions/admin";
import { formatDate, formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Content" };

const HELP: Record<string, string> = {
  "archive.entry_fee_kobo": "One-time publication fee in kobo (299900 = ₦2,999). Admins only.",
  "university.disclaimer": "Shown in the footer and About page. Keep the independence statement clear.",
  "faces.consent_version": "Bump this when the editorial consent wording changes; new submissions record it.",
};

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin("/admin/content", "content");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const done = sp.done === "1";
  const entries = Object.values(await getContentMap());

  return (
    <div className="space-y-8">
      <AdminHeader
        eyebrow="Content"
        title="Institutional facts and settings."
        description="Every institutional fact keeps a source and a review date (plan §13). Do not paste university copy without permission — summarise and cite."
      />

      {error && (
        <div role="alert" className="border border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] px-4 py-3 text-[12px] text-[#9b2c2c]">
          {error}
        </div>
      )}
      {done && (
        <div role="status" className="border border-green/30 bg-green/[0.06] px-4 py-3 text-[12px] text-green-deep">
          Saved.
        </div>
      )}

      <ul className="space-y-4">
        {entries.map((entry) => {
          const locked = entry.key === "archive.entry_fee_kobo" && !admin.permissions.includes("payments");
          return (
            <li key={entry.key} className="border border-navy/15 bg-paper p-5">
              <form action={updateContentAction} className="space-y-3">
                <input type="hidden" name="key" value={entry.key} />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-[11px] text-charcoal/70">{entry.key}</p>
                  <p className="text-[10px] text-charcoal/35">
                    Reviewed {formatDate(entry.lastReviewed)} · updated {formatDate(entry.updatedAt)}
                  </p>
                </div>
                {HELP[entry.key] && <p className="text-[10.5px] text-charcoal/45">{HELP[entry.key]}</p>}
                {entry.key === "archive.entry_fee_kobo" && (
                  <p className="text-[11px] text-charcoal/60">Currently {formatNaira(Number(entry.value))}</p>
                )}
                <textarea
                  name="value"
                  defaultValue={entry.value}
                  disabled={locked}
                  rows={entry.value.length > 120 ? 4 : 1}
                  className="w-full border border-navy/20 bg-paper px-3 py-2 text-[12.5px] leading-relaxed text-navy disabled:bg-navy/[0.03]"
                />
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-[9.5px] uppercase tracking-[0.12em] text-charcoal/40">
                    Source URL
                    <input
                      name="sourceUrl"
                      type="url"
                      defaultValue={entry.sourceUrl ?? ""}
                      disabled={locked}
                      className="w-80 border border-navy/20 px-3 py-1.5 text-[11.5px] normal-case tracking-normal text-navy"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[9.5px] uppercase tracking-[0.12em] text-charcoal/40">
                    Last reviewed
                    <input
                      name="lastReviewed"
                      type="date"
                      defaultValue={entry.lastReviewed ?? ""}
                      disabled={locked}
                      className="border border-navy/20 px-3 py-1.5 text-[11.5px] normal-case tracking-normal text-navy"
                    />
                  </label>
                  {!locked && (
                    <button type="submit" className="btn btn-ghost !px-4 !py-1.5 text-[10.5px] text-navy">
                      Save
                    </button>
                  )}
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
