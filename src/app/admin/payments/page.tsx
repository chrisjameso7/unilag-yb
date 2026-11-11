import Link from "next/link";
import type { Metadata } from "next";
import { AdminEmpty, AdminHeader, Pill } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/auth";
import { adminListPayments } from "@/lib/queries";
import { refundPaymentAction } from "@/lib/actions/admin";
import { formatDateTime, formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payments" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const STATUSES = ["", "succeeded", "pending", "initialized", "failed", "refunded"];

export default async function AdminPaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin("/admin/payments", "payments");
  const sp = await searchParams;
  const status = typeof sp.status === "string" && STATUSES.includes(sp.status) ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const done = sp.done === "refund";

  const payments = await adminListPayments({ status: status || undefined, q: q || undefined });

  return (
    <div className="space-y-8">
      <AdminHeader
        eyebrow="Payments"
        title="Entry fees."
        description="Every checkout attempt. A payment only counts once Paystack confirms it server-side (webhook or verified redirect). Test-mode and local-harness rows are excluded from revenue."
      />

      {error && (
        <div role="alert" className="border border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] px-4 py-3 text-[12px] text-[#9b2c2c]">
          {error}
        </div>
      )}
      {done && (
        <div role="status" className="border border-green/30 bg-green/[0.06] px-4 py-3 text-[12px] text-green-deep">
          Refund recorded. Paystack will confirm it through the webhook when it settles.
        </div>
      )}

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-[9.5px] uppercase tracking-[0.12em] text-charcoal/40">
          Search
          <input
            name="q"
            defaultValue={q}
            placeholder="Reference, email or name"
            className="w-64 border border-navy/20 bg-paper px-3 py-2 text-[12px] normal-case tracking-normal text-navy"
          />
        </label>
        <label className="flex flex-col gap-1 text-[9.5px] uppercase tracking-[0.12em] text-charcoal/40">
          Status
          <select
            name="status"
            defaultValue={status}
            className="border border-navy/20 bg-paper px-3 py-2 text-[12px] normal-case tracking-normal text-navy"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s || "All"}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-ghost !px-4 !py-2 text-[11px] text-navy">
          Filter
        </button>
      </form>

      {payments.length === 0 ? (
        <AdminEmpty title="No payments match." body="Checkout attempts will appear here." />
      ) : (
        <div className="overflow-x-auto border border-navy/15 bg-paper">
          <table className="w-full min-w-[860px] text-left text-[11px]">
            <thead>
              <tr className="border-b border-navy/10 text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
                <th className="px-3 py-2.5 font-normal">Student</th>
                <th className="px-3 py-2.5 font-normal">Reference</th>
                <th className="px-3 py-2.5 font-normal">Amount</th>
                <th className="px-3 py-2.5 font-normal">Gateway</th>
                <th className="px-3 py-2.5 font-normal">Status</th>
                <th className="px-3 py-2.5 font-normal">Date</th>
                <th className="px-3 py-2.5 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/[0.07]">
              {payments.map((payment) => (
                <tr key={payment.id} className="align-top">
                  <td className="px-3 py-2.5">
                    {payment.profileId ? (
                      <Link href={`/admin/students/${payment.profileId}`} className="text-charcoal/80 hover:underline">
                        {payment.fullName ?? "Unnamed"}
                      </Link>
                    ) : (
                      <span className="text-charcoal/50">{payment.fullName ?? "Deleted account"}</span>
                    )}
                    <p className="mt-0.5 text-[10px] text-charcoal/40">{payment.email ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[10.5px] text-charcoal/60">{payment.reference}</td>
                  <td className="px-3 py-2.5 text-charcoal/75">{formatNaira(payment.amountKobo)}</td>
                  <td className="px-3 py-2.5 text-charcoal/55">
                    {payment.gateway} · {payment.mode}
                    {payment.channel ? ` · ${payment.channel}` : ""}
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill status={payment.paymentStatus} />
                  </td>
                  <td className="px-3 py-2.5 text-charcoal/40">
                    {formatDateTime(payment.paidAt ?? payment.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {payment.paymentStatus === "succeeded" && (
                      <form action={refundPaymentAction}>
                        <input type="hidden" name="reference" value={payment.reference} />
                        <button
                          type="submit"
                          className="text-[9.5px] uppercase tracking-[0.1em] text-[#9b2c2c] underline underline-offset-4"
                        >
                          Refund
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10.5px] leading-relaxed text-charcoal/35">
        Refunding returns the fee through Paystack and is recorded in the audit log. It does not
        unpublish the student&apos;s page; suspend the page from the student record if that is
        intended.
      </p>
    </div>
  );
}
