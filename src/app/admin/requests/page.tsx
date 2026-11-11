import Link from "next/link";
import type { Metadata } from "next";
import { AdminEmpty, AdminHeader, Pill } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/auth";
import { adminListRequests } from "@/lib/queries";
import { resolveRequestAction } from "@/lib/actions/admin";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Requests" };

const TYPE_LABEL: Record<string, string> = {
  correction: "Correction",
  deactivation: "Hide page",
  removal: "Removal",
  data_export: "Data export",
};

const TYPE_GUIDANCE: Record<string, string> = {
  correction: "Make the change from the student record, then mark resolved.",
  deactivation: "The page is hidden already if the student used the dashboard switch.",
  removal: "Mark the page removed, delete stored files, and reply to confirm.",
  data_export: "Send the student a copy of their profile, verification status and payment history.",
};

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/admin/requests", "requests");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const requests = await adminListRequests();

  return (
    <div className="space-y-8">
      <AdminHeader
        eyebrow="Requests"
        title="Corrections and privacy requests."
        description="Students can ask for corrections, hide or remove their page, or request a copy of their data. Every decision is recorded in the audit log."
      />

      {error && (
        <div role="alert" className="border border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] px-4 py-3 text-[12px] text-[#9b2c2c]">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <AdminEmpty title="No requests yet." body="Requests from the student dashboard appear here." />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id} className="border border-navy/15 bg-paper p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="display text-[1.2rem] leading-none">
                      {TYPE_LABEL[request.requestType] ?? request.requestType}
                    </p>
                    <Pill status={request.status === "open" ? "open" : request.status === "resolved" ? "verified" : "none"} label={request.status} />
                  </div>
                  <p className="mt-2 text-[11px] text-charcoal/45">
                    {request.profileId ? (
                      <Link href={`/admin/students/${request.profileId}`} className="text-charcoal/70 hover:underline">
                        {request.fullName ?? "Unnamed"}
                      </Link>
                    ) : (
                      "No profile"
                    )}{" "}
                    · {request.email} · {formatDateTime(request.createdAt)}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-[12.5px] leading-relaxed text-charcoal/75">
                    {request.message}
                  </p>
                  {request.status === "open" && (
                    <p className="mt-3 text-[10.5px] text-charcoal/40">{TYPE_GUIDANCE[request.requestType]}</p>
                  )}
                </div>

                {request.status === "open" && (
                  <div className="flex shrink-0 gap-2">
                    {(["resolved", "dismissed"] as const).map((decision) => (
                      <form key={decision} action={resolveRequestAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="decision" value={decision} />
                        <button
                          type="submit"
                          className={`border px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] ${
                            decision === "resolved"
                              ? "border-green/40 text-green-deep hover:bg-green/[0.05]"
                              : "border-navy/20 text-charcoal/55 hover:border-navy/40"
                          }`}
                        >
                          {decision === "resolved" ? "Mark resolved" : "Dismiss"}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
