import type { Metadata } from "next";
import { AdminEmpty, AdminHeader } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/auth";
import { listAuditLogs } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage() {
  await requireAdmin("/admin/audit", "audit");
  const logs = await listAuditLogs(300);

  return (
    <div className="space-y-8">
      <AdminHeader
        eyebrow="Audit log"
        title="Every privileged action."
        description="Verification decisions, document views, moderation, refunds, content edits, editorial selections and webhook-confirmed payments. Entries cannot be edited from the console."
      />

      {logs.length === 0 ? (
        <AdminEmpty title="Nothing recorded yet." body="Actions taken in the console will appear here." />
      ) : (
        <div className="overflow-x-auto border border-navy/15 bg-paper">
          <table className="w-full min-w-[760px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-navy/10 text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
                <th className="px-3 py-2.5 font-normal">When</th>
                <th className="px-3 py-2.5 font-normal">Actor</th>
                <th className="px-3 py-2.5 font-normal">Action</th>
                <th className="px-3 py-2.5 font-normal">Target</th>
                <th className="px-3 py-2.5 font-normal">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/[0.07]">
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2.5 text-charcoal/45">{formatDateTime(log.createdAt)}</td>
                  <td className="px-3 py-2.5 text-charcoal/60">{log.adminEmail}</td>
                  <td className="px-3 py-2.5 font-mono text-[10.5px] text-charcoal/80">{log.action}</td>
                  <td className="px-3 py-2.5 text-charcoal/50">
                    {log.targetType ? `${log.targetType}` : "—"}
                    {log.targetId && <span className="block font-mono text-[9.5px] text-charcoal/35">{log.targetId}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-charcoal/55">{log.detail ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
