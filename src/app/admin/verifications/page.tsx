import Link from "next/link";
import { AdminEmpty, AdminHeader, Pill } from "@/components/admin/AdminUI";
import { adminListVerifications } from "@/lib/queries";
import { reviewVerificationAction } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin("/admin/verifications", "verifications");
  const sp = await searchParams;
  const status = sp.status === "verified" || sp.status === "rejected" ? sp.status : "pending";
  const done = typeof sp.done === "string" ? sp.done : undefined;
  const published = sp.published === "1";
  const error = typeof sp.error === "string" ? sp.error : undefined;

  const records = await adminListVerifications(status);

  return (
    <div className="space-y-8">
      <AdminHeader
        eyebrow="Verification"
        title="Student review queue"
        description="A person reviews every submission. Approving a student unlocks checkout, and publishes their page automatically if the rest of the checklist is complete."
      />

      {done === "approve" && (
        <div className="border border-green/25 bg-green/[0.05] px-4 py-3 text-[12px] leading-relaxed text-green-deep">
          Verification approved.{published ? " The student's page is now published." : " The student can now complete payment."}
        </div>
      )}
      {done === "reject" && (
        <div className="border border-navy/20 bg-navy/[0.03] px-4 py-3 text-[12px] leading-relaxed text-charcoal/60">
          Verification rejected. The student can submit a new document.
        </div>
      )}
      {error && (
        <div className="border border-[#9b2c2c]/25 bg-[#9b2c2c]/[0.04] px-4 py-3 text-[12px] text-[#9b2c2c]">
          {error}
        </div>
      )}

      <div className="flex gap-1 border-b border-navy/10">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/verifications?status=${tab.value}`}
            aria-current={status === tab.value ? "page" : undefined}
            className={`border-b-2 px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
              status === tab.value
                ? "border-navy text-navy"
                : "border-transparent text-charcoal/40 hover:text-charcoal/70"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {records.length === 0 ? (
        <AdminEmpty
          title={status === "pending" ? "The queue is empty." : `No ${status} records.`}
          body={
            status === "pending"
              ? "New student ID submissions will appear here for review."
              : "Records move here after a reviewer decides."
          }
        />
      ) : (
        <ul className="space-y-4">
          {records.map((record) => {
            const id = String(record.id);
            const documentPath = record.documentPath ? String(record.documentPath) : null;
            return (
              <li key={id} className="border border-navy/15 bg-paper">
                <div className="flex flex-col justify-between gap-4 border-b border-navy/10 p-5 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="display text-[1.35rem] leading-none">
                        {String(record.fullName ?? record.claimedName ?? "Unnamed")}
                      </h2>
                      <Pill status={status} />
                    </div>
                    <p className="mt-2 text-[11px] text-charcoal/45">
                      {String(record.email)} · submitted {formatDateTime(String(record.createdAt))}
                    </p>
                    <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] sm:grid-cols-4">
                      <div>
                        <dt className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">Method</dt>
                        <dd className="mt-0.5 text-charcoal/70">{String(record.method)}</dd>
                      </div>
                      <div>
                        <dt className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">Matric</dt>
                        <dd className="mt-0.5 text-charcoal/70">
                          {record.matricNumber ? String(record.matricNumber) : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">Department</dt>
                        <dd className="mt-0.5 text-charcoal/70">
                          {record.departmentName ? String(record.departmentName) : "No profile yet"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">Entity</dt>
                        <dd className="mt-0.5 break-all text-charcoal/70">
                          {record.providerEntityId ? String(record.providerEntityId) : "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {documentPath && (
                      <a
                        href={`/api/admin/verification-document/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost !px-3 !py-1.5 text-[10px] uppercase tracking-[0.1em] text-navy"
                      >
                        Open document
                      </a>
                    )}{record.profileId && (
                      <Link
                        href={`/admin/students/${record.profileId}`}
                        className="btn btn-ghost !px-3 !py-1.5 text-[10px] uppercase tracking-[0.1em] text-navy"
                        >
                        Student
                      </Link>
                    )}
                  </div>
                </div>

                {status === "pending" ? (
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    <form action={reviewVerificationAction}>
                      <input type="hidden" name="verificationId" value={id} />
                      <input type="hidden" name="decision" value="approve" />
                      <p className="text-[11px] leading-relaxed text-charcoal/45">
                        Confirm the name, photo and matriculation number match a UNILAG student
                        record before approving.
                      </p>
                      <button type="submit" className="btn btn-primary mt-3 !px-4 !py-2 text-[11px]">
                        Approve student
                      </button>
                    </form>

                    <form action={reviewVerificationAction} className="md:border-l md:border-navy/10 md:pl-4">
                      <input type="hidden" name="verificationId" value={id} />
                      <input type="hidden" name="decision" value="reject" />
                      <label
                        htmlFor={`reason-${id}`}
                        className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35"
                      >
                        Reason (shown to the student)
                      </label>
                      <input
                        id={`reason-${id}`}
                        name="reason"
                        maxLength={500}
                        className="input mt-1.5 !py-2 text-[12px]"
                        placeholder="ID photo is unreadable; please resubmit."
                      />
                      <button
                        type="submit"
                        className="mt-3 border border-navy/20 px-4 py-2 text-[11px] uppercase tracking-[0.1em] text-charcoal/60 hover:border-navy/40"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[11px] text-charcoal/45">
                    <span>
                      {record.rejectionReason
                        ? `Reason: ${String(record.rejectionReason)}`
                        : "Approved for publication eligibility."}
                    </span>
                    <Pill status={status} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="border-t border-navy/10 pt-4 text-[10px] leading-relaxed text-charcoal/35">
        Verification documents are served only through this authenticated route and are never
        included in public pages, exports or logs. Approval is recorded in the audit log.
      </p>
    </div>
  );
}
