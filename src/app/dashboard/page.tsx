import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { Portrait } from "@/components/Portrait";
import { ShareButtons } from "@/components/ShareButtons";
import { EditRequestForm } from "@/components/dashboard/EditRequestForm";
import { Notice } from "@/components/PageHero";
import { requireUser } from "@/lib/auth";
import { loadJourney, STEP_HREF } from "@/lib/journey";
import { getEditRequestsForUser } from "@/lib/queries";
import { logoutAction } from "@/lib/actions/auth";
import {
  setFacesOptInAction,
  setPublicationVisibilityAction,
  setSearchIndexingAction,
  updateGraduationStatusAction,
} from "@/lib/actions/profile";
import { formatDate, formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Page", robots: { index: false } };

const STATUS: Record<string, { label: string; tone: string }> = {
  published: { label: "Live in the yearbook", tone: "bg-green text-white" },
  draft: { label: "Not public yet", tone: "bg-navy/10 text-navy" },
  pending_payment: { label: "Awaiting payment", tone: "bg-amber/15 text-amber" },
  suspended: { label: "On hold", tone: "bg-danger/10 text-danger" },
  removed: { label: "Removed", tone: "bg-danger/10 text-danger" },
};

function Toggle({ action, name, on, labelOn, labelOff }: { action: (fd: FormData) => Promise<void>; name: string; on: boolean; labelOn: string; labelOff: string }) {
  return (
    <form action={action}>
      <input type="hidden" name={name} value={on ? "" : "on"} />
      <button type="submit" className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-[0.9rem] text-navy">
        <span>{on ? labelOn : labelOff}</span>
        <span aria-hidden="true" className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-green" : "bg-navy/20"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.125rem]" : "left-0.5"}`} />
        </span>
      </button>
    </form>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const [j, requests] = await Promise.all([loadJourney(user.id), getEditRequestsForUser(user.id)]);
  const p = j.profile;
  const status = STATUS[p?.publicationStatus ?? "draft"] ?? STATUS.draft;
  const live = p?.publicationStatus === "published";

  return (
    <SiteShell>
      <section className="bg-navy text-ivory">
        <div className="container-page py-10 md:py-14">
          <p className="eyebrow text-ivory/50">My Page</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,9vw,4rem)]">{p ? `Hello, ${p.fullName.split(" ")[0]}.` : "Welcome."}</h1>
          <p className="mt-4"><span className={`eyebrow rounded-full px-3 py-1.5 ${status.tone}`}>{status.label}</span></p>
        </div>
      </section>

      <div className="container-page grid gap-8 py-8 md:grid-cols-[1.2fr_0.8fr] md:py-12">
        <div className="space-y-6">
          {sp.password === "updated" && <Notice tone="success">Password updated.</Notice>}
          {sp.error === "admin-only" && <Notice tone="error">That area is for the yearbook team.</Notice>}

          {!live && (
            <div className="card p-5">
              <p className="font-medium text-navy">{p ? "Finish your page" : "Start your page"}</p>
              <p className="mt-1 text-[0.88rem] text-charcoal/60">
                {j.readiness.reasons[0] ?? "A few steps and you're in the yearbook."}
              </p>
              <Link href={STEP_HREF[j.next === "live" ? "preview" : j.next]} className="btn btn-primary mt-4 w-full sm:w-auto">Continue</Link>
            </div>
          )}

          {p && (
            <div className="card overflow-hidden">
              <div className="flex gap-4 p-5">
                <div className="relative h-32 w-[6.4rem] shrink-0 overflow-hidden rounded-2xl bg-navy">
                  <Portrait name={p.fullName} src={p.portraitPath} seed={p.slug} year={p.graduationYear} sizes="104px" />
                </div>
                <div className="min-w-0">
                  <p className="display text-[1.7rem] leading-tight text-navy">{p.fullName}</p>
                  <p className="mt-1 text-[0.82rem] text-charcoal/60">{p.departmentName}</p>
                  <p className="text-[0.78rem] text-charcoal/50">{p.facultyName} · {p.admissionYear}–{p.graduationYear}</p>
                  {live && <p className="mt-2 truncate font-mono text-[0.72rem] text-charcoal/45">/student/{p.slug}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-navy/10 p-4">
                <Link href="/join/profile" className="btn btn-sm btn-dark">Edit my page</Link>
                {live ? (
                  <Link href={`/student/${p.slug}`} className="btn btn-sm btn-ghost text-navy">View</Link>
                ) : (
                  <Link href="/join/preview" className="btn btn-sm btn-ghost text-navy">Preview</Link>
                )}
              </div>
              {live && <div className="border-t border-navy/10 p-4"><ShareButtons title={`${p.fullName} — UNILAG Yearbook`} path={`/student/${p.slug}`} /></div>}
            </div>
          )}

          <div className="card p-5">
            <p className="font-medium text-navy">Need something changed?</p>
            <p className="mb-4 mt-1 text-[0.85rem] text-charcoal/60">Corrections the form can&apos;t make, removal, or a copy of your data.</p>
            <EditRequestForm />
            {requests.length > 0 && (
              <ul className="mt-5 divide-y divide-navy/10 border-t border-navy/10 text-[0.85rem]">
                {requests.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 py-2.5">
                    <span className="text-charcoal/70">{r.requestType.replace("_", " ")} · {formatDate(r.createdAt)}</span>
                    <span className="text-charcoal/50">{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          {p && (
            <div className="card divide-y divide-navy/10 px-5">
              <p className="eyebrow py-4 text-charcoal/45">Settings</p>
              <Toggle action={updateGraduationStatusAction} name="graduationStatus" on={p.graduationStatus === "graduated"} labelOn="I've graduated" labelOff="I've graduated" />
              <Toggle action={setFacesOptInAction} name="facesOptIn" on={p.facesOptIn} labelOn="Consider me for Faces of the Year" labelOff="Consider me for Faces of the Year" />
              <Toggle action={setSearchIndexingAction} name="searchIndexing" on={p.searchIndexing} labelOn="Show my page in search engines" labelOff="Show my page in search engines" />
              <div className="py-3">
                <Link href="/faces-of-the-year/submit" className="link text-[0.85rem]">Faces submissions & approvals</Link>
              </div>
            </div>
          )}

          {p && (live || p.publicationStatus === "draft") && j.paid && (
            <div className="card p-5">
              <p className="font-medium text-navy">Visibility</p>
              <p className="mt-1 text-[0.82rem] text-charcoal/60">
                {live ? "Hide your page from the yearbook. You can bring it back any time — no extra charge." : "Your page is hidden. Bring it back whenever you like."}
              </p>
              <form action={setPublicationVisibilityAction} className="mt-3">
                <input type="hidden" name="intent" value={live ? "hide" : "show"} />
                <button type="submit" className="btn btn-sm btn-ghost text-navy">{live ? "Hide my page" : "Show my page again"}</button>
              </form>
            </div>
          )}

          <div className="card p-5 text-[0.85rem]">
            <p className="eyebrow text-charcoal/45">Account</p>
            <p className="mt-3 break-all text-charcoal/75">{user.email}</p>
            {j.paid && <p className="mt-2 text-charcoal/60">Paid {formatNaira(j.paid.amountKobo)} on {formatDate(j.paid.paidAt)}{j.paid.mode === "test" ? " (test)" : ""}</p>}
            <p className="mt-2 text-charcoal/60">Verification: {j.verified ? "verified" : j.verification?.status ?? "not started"}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/forgot-password" className="btn btn-sm btn-ghost text-navy">Change password</Link>
              <form action={logoutAction}><button type="submit" className="btn btn-sm text-charcoal/60">Sign out</button></form>
            </div>
          </div>
          <p className="px-1 text-[0.75rem] leading-relaxed text-charcoal/45">
            Public: your name, portrait, faculty, department, years and line. Never public: email, ID documents, matric number and payment details.
          </p>
        </aside>
      </div>
    </SiteShell>
  );
}
