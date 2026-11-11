import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Pill } from "@/components/admin/AdminUI";
import { Portrait } from "@/components/Portrait";
import { adminGetStudent } from "@/lib/queries";
import { publicationReadiness, type Readiness } from "@/lib/publish";
import { requireAdmin } from "@/lib/auth";
import { adminClient } from "@/lib/supabase/admin";
import {
  purgeVerificationDocumentAction,
  setStudentPublicationAction,
  suspendAccountAction,
} from "@/lib/actions/admin";
import { academicRange, formatDateTime, formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function AdminStudentDetailPage({ params }: { params: Params }) {
  const admin = await requireAdmin("/admin/students", "students");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await adminGetStudent(id);
  if (!data) notFound();

  const profile = data.profile;
  const readiness: Readiness | null = profile.userId
    ? await publicationReadiness(profile.userId)
    : null;
  const account = profile.userId
    ? (
        await adminClient()
          .from("users")
          .select("account_status")
          .eq("id", profile.userId)
          .maybeSingle()
      ).data
    : null;
  const canSeePayments = admin.permissions.includes("payments");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-charcoal/35">
        <Link href="/admin/students" className="hover:text-navy">
          Students
        </Link>
        <span aria-hidden="true">/</span>
        <span>{profile.fullName}</span>
      </div>

      <AdminHeader
        eyebrow="Student profile"
        title={profile.fullName}
        description={`${profile.departmentName} · ${profile.facultyName} · ${academicRange(profile.admissionYear, profile.graduationYear)}`}
        actions={
          <>
            <Pill status={profile.publicationStatus} />
            <Pill status={profile.verificationStatus} label={`verify: ${profile.verificationStatus}`} />
            {profile.isDemo && <Pill status="none" label="demo" />}
            {profile.publicationStatus === "published" && (
              <Link
                href={`/student/${profile.slug}`}
                className="btn btn-ghost !px-3 !py-1.5 text-[10px] uppercase tracking-[0.1em] text-navy"
              >
                Public page
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-8">
          <section className="border border-navy/15 bg-paper p-5">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="relative aspect-[4/5] w-32 shrink-0 overflow-hidden bg-navy">
                <Portrait
                  name={profile.fullName}
                  src={profile.portraitUrl}
                  seed={profile.slug}
                  year={profile.graduationYear}
                  sizes="128px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.12em] text-charcoal/35">
                  {profile.publicIdentifier} · /student/{profile.slug}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-charcoal/70">
                  {profile.bio || "No biography yet."}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-navy/10 pt-3 text-[11px]">
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">Email</dt>
                    <dd className="mt-0.5 break-all text-charcoal/70">{profile.email ?? "No account"}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">Graduation status</dt>
                    <dd className="mt-0.5 text-charcoal/70">
                      {profile.graduationStatus.replace("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">Consent</dt>
                    <dd className="mt-0.5 text-charcoal/70">
                      {profile.consentPublic ? "Given" : "Not given"}
                      {profile.facesOptIn ? " · Faces opt-in" : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase tracking-[0.12em] text-charcoal/35">Created</dt>
                    <dd className="mt-0.5 text-charcoal/70">{formatDateTime(profile.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section>
            <h2 className="display text-[1.5rem] leading-none">Verification history</h2>
            {data.verifications.length === 0 ? (
              <p className="mt-3 border border-dashed border-navy/20 px-4 py-6 text-[12px] text-charcoal/45">
                No verification record. The student cannot publish until one is approved.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-navy/10 border-y border-navy/10">
                {data.verifications.map((record) => (
                  <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <div>
                      <p className="text-[11.5px] text-charcoal/70">
                        {record.method} · {record.matricNumber ?? "no matric"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-charcoal/35">
                        {formatDateTime(record.createdAt)}
                        {record.providerEntityId ? ` · ${record.providerEntityId}` : ""}
                      </p>
                      {record.rejectionReason && (
                        <p className="mt-1 text-[10px] text-[#9b2c2c]">{record.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Pill status={record.status} />
                      {record.documentPath && (
                        <a
                          href={`/api/admin/verification-document/${record.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9.5px] uppercase tracking-[0.1em] text-green underline underline-offset-4"
                        >
                          Document
                        </a>
                      )}
                      {record.documentPath && record.status !== "pending" && (
                        <form action={purgeVerificationDocumentAction}>
                          <input type="hidden" name="verificationId" value={record.id} />
                          <input type="hidden" name="back" value={`/admin/students/${profile.id}`} />
                          <button
                            type="submit"
                            className="text-[9.5px] uppercase tracking-[0.1em] text-charcoal/40 underline underline-offset-4 hover:text-navy"
                          >
                            Delete file
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/verifications"
              className="mt-3 inline-block text-[10px] uppercase tracking-[0.1em] text-green underline underline-offset-4"
            >
              Go to review queue
            </Link>
          </section>

          {canSeePayments && (
          <section>
            <h2 className="display text-[1.5rem] leading-none">Payments</h2>
            {data.payments.length === 0 ? (
              <p className="mt-3 border border-dashed border-navy/20 px-4 py-6 text-[12px] text-charcoal/45">
                No payment attempts recorded.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto border border-navy/15">
                <table className="w-full min-w-[600px] text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-navy/10 text-[9px] uppercase tracking-[0.12em] text-charcoal/35">
                      <th className="px-3 py-2.5 font-normal">Reference</th>
                      <th className="px-3 py-2.5 font-normal">Amount</th>
                      <th className="px-3 py-2.5 font-normal">Gateway</th>
                      <th className="px-3 py-2.5 font-normal">Status</th>
                      <th className="px-3 py-2.5 font-normal">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy/[0.07]">
                    {data.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-3 py-2.5 text-charcoal/60">{payment.reference}</td>
                        <td className="px-3 py-2.5 text-charcoal/75">{formatNaira(payment.amountKobo)}</td>
                        <td className="px-3 py-2.5 text-charcoal/55">
                          {payment.gateway} · {payment.mode}
                        </td>
                        <td className="px-3 py-2.5">
                          <Pill status={payment.paymentStatus} />
                        </td>
                        <td className="px-3 py-2.5 text-charcoal/40">{formatDateTime(payment.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}

          {data.submissions.length > 0 && (
            <section>
              <h2 className="display text-[1.5rem] leading-none">Faces of the Year</h2>
              <ul className="mt-4 divide-y divide-navy/10 border-y border-navy/10">
                {data.submissions.map((submission) => (
                  <li key={submission.id} className="flex items-center justify-between gap-3 py-3 text-[11.5px]">
                    <span className="text-charcoal/65">
                      {submission.editionYear ? `Faces of ${submission.editionYear}` : "Unassigned"} ·{" "}
                      {formatDateTime(submission.submittedAt)}
                    </span>
                    <Pill status={submission.status === "selected" ? "verified" : submission.status === "declined" ? "rejected" : "pending"} label={submission.status.replace("_", " ")} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {readiness && (
          <div className="border border-navy/15 bg-paper p-5">
            <p className="eyebrow text-charcoal/40">Publication gate</p>
            <ul className="mt-3 space-y-2 text-[11px]">
              {[
                ["Verified student", readiness.hasVerifiedStudent],
                ["Portrait", readiness.hasPortrait],
                ["Biography ≥ 20 chars", readiness.hasBiography],
                ["Consent", readiness.hasConsent],
                ["Confirmed payment", readiness.hasPaid],
              ].map(([label, done]) => (
                <li key={String(label)} className="flex items-center gap-2 text-charcoal/60">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
                      done ? "border-green bg-green text-ivory" : "border-navy/25 text-charcoal/25"
                    }`}
                  >
                    {done ? "✓" : ""}
                  </span>
                  {String(label)}
                </li>
              ))}
            </ul>
            {readiness.reasons.length > 0 && (
              <p className="mt-3 border-t border-navy/10 pt-3 text-[10px] leading-relaxed text-charcoal/35">
                {readiness.reasons.join(" ")}
              </p>
            )}
          </div>
          )}

          <div className="border border-navy/15 bg-paper p-5">
            <p className="eyebrow text-charcoal/40">Moderation</p>
            <p className="mt-2 text-[10.5px] leading-relaxed text-charcoal/40">
              Suspending removes a page from the archive immediately. Removing is a stronger,
              recordable action. Restoring returns a page to draft, then republishes only if the gate
              passes.
            </p>

            <div className="mt-4 space-y-2">
              {profile.publicationStatus !== "suspended" && (
                <form action={setStudentPublicationAction}>
                  <input type="hidden" name="profileId" value={profile.id} />
                  <input type="hidden" name="intent" value="suspend" />
                  <button
                    type="submit"
                    className="w-full border border-[#9b2c2c]/30 px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[#9b2c2c] hover:bg-[#9b2c2c]/[0.05]"
                  >
                    Suspend page
                  </button>
                </form>
              )}
              {profile.publicationStatus !== "removed" && (
                <form action={setStudentPublicationAction}>
                  <input type="hidden" name="profileId" value={profile.id} />
                  <input type="hidden" name="intent" value="remove" />
                  <button
                    type="submit"
                    className="w-full border border-navy/20 px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-charcoal/55 hover:border-navy/40"
                  >
                    Mark removed
                  </button>
                </form>
              )}
              {(profile.publicationStatus === "suspended" ||
                profile.publicationStatus === "removed") && (
                <form action={setStudentPublicationAction}>
                  <input type="hidden" name="profileId" value={profile.id} />
                  <input type="hidden" name="intent" value="restore" />
                  <button
                    type="submit"
                    className="w-full border border-green/40 px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-green-deep hover:bg-green/[0.05]"
                  >
                    Restore and republish
                  </button>
                </form>
              )}
            </div>
          </div>

          {profile.userId && account && (
            <div className="border border-navy/15 bg-paper p-5">
              <p className="eyebrow text-charcoal/40">Account</p>
              <p className="mt-2 text-[10.5px] leading-relaxed text-charcoal/40">
                Suspending the account blocks sign-in to the dashboard. It does not change the public
                page — suspend the page separately if needed.
              </p>
              <form action={suspendAccountAction} className="mt-4">
                <input type="hidden" name="userId" value={profile.userId} />
                <input type="hidden" name="profileId" value={profile.id} />
                <input
                  type="hidden"
                  name="intent"
                  value={account.account_status === "active" ? "suspend" : "reactivate"}
                />
                <button
                  type="submit"
                  className="w-full border border-navy/20 px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-charcoal/55 hover:border-navy/40"
                >
                  {account.account_status === "active" ? "Suspend account" : "Reactivate account"}
                </button>
              </form>
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-charcoal/30">
            Account created {formatDateTime(profile.userCreatedAt)}. Matriculation numbers
            and documents are private; do not copy them outside the review process.
          </p>
        </aside>
      </div>
    </div>
  );
}
