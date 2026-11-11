import Link from "next/link";
import { AdminEmpty, AdminHeader, Pill, Stat } from "@/components/admin/AdminUI";
import { getAdminOverview, listAuditLogs } from "@/lib/queries";
import { formatDateTime, formatNaira } from "@/lib/format";
import { paystackConfigured } from "@/lib/payments";
import { studidStatus } from "@/lib/studid";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const admin = await requireAdmin("/admin");
  const canSeePayments = admin.permissions.includes("payments");
  const [overview, audit] = await Promise.all([getAdminOverview(), listAuditLogs(6)]);
  const studid = studidStatus();
  const paystack = paystackConfigured();

  const attention = [
    overview.pendingVerifications > 0 && {
      href: "/admin/verifications",
      label: `${overview.pendingVerifications} verification${overview.pendingVerifications === 1 ? "" : "s"} waiting`,
      detail: "Students cannot pay or publish until a reviewer decides.",
    },
    overview.openRequests > 0 && {
      href: "/admin/requests",
      label: `${overview.openRequests} open request${overview.openRequests === 1 ? "" : "s"}`,
      detail: "Corrections, hides and removal requests from students.",
    },
    overview.failedPayments > 0 && {
      href: "/admin/payments?status=failed",
      label: `${overview.failedPayments} failed payment${overview.failedPayments === 1 ? "" : "s"}`,
      detail: "Check whether a student was charged without a page being published.",
    },
  ].filter(Boolean) as Array<{ href: string; label: string; detail: string }>;

  return (
    <div className="space-y-10">
      <AdminHeader
        eyebrow="Overview"
        title="The archive, at a glance."
        description="Verification, publication, payments and the work waiting on a human decision."
        actions={
          <>
            <Link href="/admin/verifications" className="btn btn-primary !px-4 !py-2 text-[11px]">
              Review verifications
            </Link>
            <Link href="/students" className="btn btn-ghost !px-4 !py-2 text-[11px] text-navy">
              View public archive
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Published pages"
          value={overview.published}
          hint={`${overview.totalProfiles} profiles in total`}
          tone="green"
          href="/admin/students?status=published"
        />
        <Stat
          label="Awaiting verification"
          value={overview.pendingVerifications}
          hint="Needs a reviewer"
          tone={overview.pendingVerifications > 0 ? "warn" : "ink"}
          href="/admin/verifications"
        />
        {canSeePayments ? (
          <Stat
            label="Confirmed revenue"
            value={formatNaira(overview.revenueKobo)}
            hint={`${overview.successfulPayments} live payments${overview.duplicatePayers > 0 ? ` · ${overview.duplicatePayers} paid twice` : ""}`}
            tone={overview.duplicatePayers > 0 ? "warn" : "ink"}
            href="/admin/payments?status=succeeded"
          />
        ) : (
          <Stat
            label="Faces submissions"
            value={overview.openSubmissions}
            hint="Awaiting editorial review"
            href="/admin/faces"
          />
        )}
        <Stat
          label="Open requests"
          value={overview.openRequests}
          hint="Corrections and removals"
          tone={overview.openRequests > 0 ? "warn" : "ink"}
          href="/admin/requests"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="display text-[1.5rem] leading-none">Needs attention</h2>
            <span className="text-[10px] uppercase tracking-[0.12em] text-charcoal/35">
              {attention.length === 0 ? "All clear" : `${attention.length} items`}
            </span>
          </div>

          {attention.length === 0 ? (
            <div className="mt-4">
              <AdminEmpty
                title="Nothing is waiting."
                body="No pending verifications, requests or failed payments. New submissions appear here automatically."
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-navy/10 border-y border-navy/10">
              {attention.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-navy/[0.02]"
                  >
                    <div>
                      <p className="text-[12.5px] text-charcoal/80">{item.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-charcoal/40">{item.detail}</p>
                    </div>
                    <span className="text-charcoal/30">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Users" value={overview.totalUsers} />
            <Stat label="Drafts" value={overview.drafts} />
            <Stat label="Verified students" value={overview.verifiedStudents} tone="green" />
            <Stat label="Suspended" value={overview.suspended} />
          </div>
        </section>

        <aside className="space-y-6">
          <div className="border border-navy/15 bg-paper p-5">
            <p className="eyebrow text-charcoal/40">System status</p>
            <ul className="mt-4 space-y-3 text-[11px]">
              <li className="flex items-center justify-between gap-3">
                <span className="text-charcoal/50">Paystack</span>
                <Pill
                  status={paystack ? "verified" : "pending"}
                  label={paystack ? "Configured" : "Not configured"}
                />
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-charcoal/50">Studid</span>
                <Pill
                  status={studid.configured ? "verified" : "pending"}
                  label={studid.configured ? "Enabled" : "Disabled"}
                />
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-charcoal/50">Faces submissions</span>
                <Pill
                  status={overview.openSubmissions > 0 ? "pending" : "none"}
                  label={`${overview.openSubmissions} open`}
                />
              </li>
            </ul>
            {!paystack && (
              <p className="mt-4 border-t border-navy/10 pt-3 text-[10px] leading-relaxed text-charcoal/35">
                Checkout is refused unless the local test harness is explicitly enabled. Set
                PAYSTACK_SECRET_KEY in the environment to take real payments.
              </p>
            )}
          </div>

          <div className="border border-navy/15 bg-paper p-5">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow text-charcoal/40">Recent activity</p>
              <Link href="/admin/audit" className="text-[9.5px] uppercase tracking-[0.1em] text-green">
                All
              </Link>
            </div>
            {audit.length === 0 ? (
              <p className="mt-4 text-[11px] leading-relaxed text-charcoal/40">
                No administrative actions recorded yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-navy/10">
                {audit.map((row) => (
                  <li key={String(row.id)} className="py-2.5">
                    <p className="text-[11px] text-charcoal/70">{String(row.action)}</p>
                    <p className="mt-0.5 text-[9.5px] text-charcoal/35">
                      {formatDateTime(String(row.createdAt))} · {String(row.adminEmail)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
