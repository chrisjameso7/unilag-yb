import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- signed private URLs are shown as-is to reviewers */
import { AdminEmpty, AdminHeader, Pill } from "@/components/admin/AdminUI";
import { requireAdmin } from "@/lib/auth";
import { adminGetEdition } from "@/lib/faces";
import {
  reviewSubmissionAction,
  selectSubmissionAction,
  setEditionStatusAction,
  updateEditionAction,
  updateEntryAction,
} from "@/lib/actions/faces";
import { academicRange, formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edition" };

const SUBMISSION_PILL: Record<string, string> = {
  submitted: "pending",
  shortlisted: "open",
  selected: "verified",
  replacement_requested: "initialized",
  declined: "rejected",
  withdrawn: "none",
};

export default async function AdminFacesEditionPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin("/admin/faces", "faces");
  const { year: rawYear } = await params;
  if (!/^\d{4}$/.test(rawYear)) notFound();
  const year = Number(rawYear);
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const filter = typeof sp.show === "string" ? sp.show : "active";

  const data = await adminGetEdition(year);
  if (!data) notFound();
  const { edition, submissions, entries } = data;

  const visibleSubmissions = submissions.filter((s) =>
    filter === "all" ? true : !["declined", "withdrawn", "selected"].includes(s.status),
  );
  const students = new Set(entries.map((e) => e.profileId)).size;
  const liveEntries = entries.filter((e) => e.publicationStatus === "published" && e.consentStatus === "granted");

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-charcoal/35">
        <Link href="/admin/faces" className="hover:text-navy">Faces of the Year</Link>
        <span aria-hidden="true">/</span>
        <span>{edition.year}</span>
      </div>

      <AdminHeader
        eyebrow={`Edition ${edition.year}`}
        title={edition.title}
        description={`${submissions.length} submissions · ${entries.length} selected (${students} students) · ${liveEntries.length} live`}
        actions={
          <>
            <Pill status={edition.publicationStatus === "published" ? "published" : "draft"} label={edition.publicationStatus} />
            {edition.publicationStatus !== "draft" && (
              <Link href={`/faces-of-the-year/${edition.year}`} className="btn btn-ghost !px-3 !py-1.5 text-[10px] uppercase tracking-[0.1em] text-navy">
                Public page
              </Link>
            )}
          </>
        }
      />

      {error && (
        <div role="alert" className="border border-[#9b2c2c]/30 bg-[#9b2c2c]/[0.05] px-4 py-3 text-[12px] text-[#9b2c2c]">
          {error}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <form action={updateEditionAction} className="space-y-3 border border-navy/15 bg-paper p-5" encType="multipart/form-data">
          <p className="eyebrow text-charcoal/40">Edition settings</p>
          <input type="hidden" name="year" value={edition.year} />
          <input name="title" defaultValue={edition.title} required maxLength={120} aria-label="Title" className="w-full border border-navy/20 px-3 py-2 text-[13px]" />
          <textarea name="introduction" defaultValue={edition.introduction} rows={6} maxLength={4000} aria-label="Editorial introduction" placeholder="Editorial introduction" className="w-full border border-navy/20 px-3 py-2 text-[12.5px] leading-relaxed" />
          <label className="flex items-center gap-2 text-[12px] text-charcoal/65">
            <input type="checkbox" name="submissionsOpen" defaultChecked={edition.submissionsOpen} className="h-4 w-4 accent-[#087B50]" />
            Accept submissions for this edition (closes any other edition)
          </label>
          <label className="block text-[10px] uppercase tracking-[0.12em] text-charcoal/40">
            Cover image (optional, used for sharing)
            <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-[11px] normal-case tracking-normal" />
          </label>
          <button type="submit" className="btn btn-ghost !px-4 !py-1.5 text-[10.5px] text-navy">Save settings</button>
        </form>

        <div className="space-y-3 border border-navy/15 bg-paper p-5">
          <p className="eyebrow text-charcoal/40">Publication</p>
          <p className="text-[11px] leading-relaxed text-charcoal/45">
            Only entries that are published, approved by the student and linked to a published
            yearbook page appear publicly. Publishing the edition closes submissions.
          </p>
          {(["published", "draft", "archived"] as const)
            .filter((s) => s !== edition.publicationStatus)
            .map((status) => (
              <form key={status} action={setEditionStatusAction}>
                <input type="hidden" name="year" value={edition.year} />
                <input type="hidden" name="status" value={status} />
                <button
                  type="submit"
                  className={`w-full border px-3 py-2 text-[10px] uppercase tracking-[0.1em] ${
                    status === "published" ? "border-green/40 text-green-deep hover:bg-green/[0.05]" : "border-navy/20 text-charcoal/55 hover:border-navy/40"
                  }`}
                >
                  {status === "published" ? "Publish edition" : status === "draft" ? "Return to draft" : "Archive edition"}
                </button>
              </form>
            ))}
          {edition.publishedAt && <p className="text-[10px] text-charcoal/35">First published {formatDate(edition.publishedAt)}</p>}
        </div>
      </section>

      <section id="submissions" className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="display text-[1.6rem] leading-none">Submissions</h2>
          <div className="flex gap-3 text-[10px] uppercase tracking-[0.12em]">
            <Link href={`/admin/faces/${year}?show=active#submissions`} className={filter !== "all" ? "text-navy" : "text-charcoal/40"}>To review</Link>
            <Link href={`/admin/faces/${year}?show=all#submissions`} className={filter === "all" ? "text-navy" : "text-charcoal/40"}>All</Link>
          </div>
        </div>
        {visibleSubmissions.length === 0 ? (
          <div className="mt-4"><AdminEmpty title="Nothing to review." body="New submissions appear here while submissions are open." /></div>
        ) : (
          <ul className="mt-4 space-y-4">
            {visibleSubmissions.map((s) => (
              <li key={s.id} className="border border-navy/15 bg-paper p-5">
                <div className="flex flex-col gap-5 md:flex-row">
                  {s.imageUrl ? (
                    <a href={s.imageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <img src={s.imageUrl} alt={`Submission from ${s.fullName}`} className="h-44 w-36 object-cover" />
                    </a>
                  ) : (
                    <div className="flex h-44 w-36 shrink-0 items-center justify-center bg-navy/5 text-[10px] text-charcoal/40">No image</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/students/${s.profileId}`} className="display text-[1.3rem] leading-none hover:underline">{s.fullName}</Link>
                      <Pill status={SUBMISSION_PILL[s.status] ?? "none"} label={s.status.replace("_", " ")} />
                      {s.profilePublicationStatus !== "published" && <Pill status="pending" label="page not published" />}
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-charcoal/45">
                      {s.departmentName} · {s.facultyName} · {academicRange(s.admissionYear, s.graduationYear)} · sent {formatDateTime(s.submittedAt)} · consent {s.consentReference}
                    </p>
                    <p className="mt-3 text-[12.5px] leading-relaxed text-charcoal/75">{s.personalIntroduction}</p>
                    {s.quote && <p className="mt-2 display text-[1rem] text-charcoal/80">“{s.quote}”</p>}
                    {s.reviewNotes && <p className="mt-2 text-[11px] text-charcoal/45">Note to student: {s.reviewNotes}</p>}

                    {!["withdrawn", "selected"].includes(s.status) && (
                      <div className="mt-4 flex flex-wrap items-start gap-2">
                        <form action={selectSubmissionAction}>
                          <input type="hidden" name="year" value={year} />
                          <input type="hidden" name="submissionId" value={s.id} />
                          <button type="submit" className="border border-green/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-green-deep hover:bg-green/[0.05]">Select</button>
                        </form>
                        {s.status !== "shortlisted" && s.status !== "declined" && (
                          <form action={reviewSubmissionAction}>
                            <input type="hidden" name="year" value={year} />
                            <input type="hidden" name="submissionId" value={s.id} />
                            <input type="hidden" name="decision" value="shortlist" />
                            <button type="submit" className="border border-navy/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-charcoal/60 hover:border-navy/40">Shortlist</button>
                          </form>
                        )}
                        {s.status === "declined" ? (
                          <form action={reviewSubmissionAction}>
                            <input type="hidden" name="year" value={year} />
                            <input type="hidden" name="submissionId" value={s.id} />
                            <input type="hidden" name="decision" value="reopen" />
                            <button type="submit" className="border border-navy/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-charcoal/60 hover:border-navy/40">Reopen</button>
                          </form>
                        ) : (
                          <form action={reviewSubmissionAction}>
                            <input type="hidden" name="year" value={year} />
                            <input type="hidden" name="submissionId" value={s.id} />
                            <input type="hidden" name="decision" value="decline" />
                            <button type="submit" className="border border-navy/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-charcoal/60 hover:border-navy/40">Decline</button>
                          </form>
                        )}
                        <form action={reviewSubmissionAction} className="flex gap-2">
                          <input type="hidden" name="year" value={year} />
                          <input type="hidden" name="submissionId" value={s.id} />
                          <input type="hidden" name="decision" value="replace" />
                          <input name="notes" placeholder="What should the new photo fix?" maxLength={500} className="w-64 border border-navy/20 px-2 py-1.5 text-[11px]" />
                          <button type="submit" className="border border-navy/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-charcoal/60 hover:border-navy/40">Request new photo</button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="entries" className="scroll-mt-24">
        <h2 className="display text-[1.6rem] leading-none">Selected entries</h2>
        <p className="mt-2 max-w-2xl text-[11.5px] leading-relaxed text-charcoal/45">
          Edit the editorial copy, then wait for the student to approve it. Changing approved words
          sends the entry back for approval. Use “record consent” only for consent obtained in
          writing elsewhere, and describe it.
        </p>
        {entries.length === 0 ? (
          <div className="mt-4"><AdminEmpty title="No entries selected yet." body="Select submissions above to start building the edition." /></div>
        ) : (
          <ul className="mt-4 space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="border border-navy/15 bg-paper p-5">
                <div className="flex flex-col gap-5 md:flex-row">
                  {entry.portraitUrl && <img src={entry.portraitUrl} alt={entry.fullName} className="h-40 w-32 shrink-0 object-cover" />}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/students/${entry.profileId}`} className="display text-[1.3rem] leading-none hover:underline">{entry.fullName}</Link>
                      <Pill status={entry.consentStatus === "granted" ? "verified" : entry.consentStatus === "withdrawn" ? "rejected" : "pending"} label={`consent ${entry.consentStatus}`} />
                      <Pill status={entry.publicationStatus === "published" ? "published" : "draft"} />
                      {!entry.profilePublished && <Pill status="pending" label="page not published" />}
                    </div>
                    {entry.consentRecordedAt && <p className="text-[10px] text-charcoal/35">Consent recorded {formatDateTime(entry.consentRecordedAt)}</p>}

                    <form action={updateEntryAction} className="space-y-2">
                      <input type="hidden" name="year" value={year} />
                      <input type="hidden" name="entryId" value={entry.id} />
                      <input type="hidden" name="intent" value="save" />
                      <textarea name="editorialIntroduction" defaultValue={entry.editorialIntroduction} maxLength={600} rows={3} aria-label="Editorial introduction" className="w-full border border-navy/20 px-3 py-2 text-[12px] leading-relaxed" />
                      <div className="flex flex-wrap gap-2">
                        <input name="quote" defaultValue={entry.quote ?? ""} maxLength={160} placeholder="Quote" aria-label="Quote" className="min-w-0 flex-1 border border-navy/20 px-3 py-1.5 text-[12px]" />
                        <input name="displayOrder" type="number" defaultValue={entry.displayOrder} aria-label="Display order" className="w-20 border border-navy/20 px-2 py-1.5 text-[12px]" />
                        <button type="submit" className="border border-navy/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-charcoal/60 hover:border-navy/40">Save copy</button>
                      </div>
                    </form>

                    <div className="flex flex-wrap items-start gap-2">
                      {entry.publicationStatus === "draft" ? (
                        <form action={updateEntryAction}>
                          <input type="hidden" name="year" value={year} />
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input type="hidden" name="intent" value="publish" />
                          <button type="submit" disabled={entry.consentStatus !== "granted" || !entry.profilePublished} className="border border-green/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-green-deep hover:bg-green/[0.05] disabled:opacity-40">Publish entry</button>
                        </form>
                      ) : (
                        <form action={updateEntryAction}>
                          <input type="hidden" name="year" value={year} />
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input type="hidden" name="intent" value="unpublish" />
                          <button type="submit" className="border border-navy/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-charcoal/60 hover:border-navy/40">Unpublish</button>
                        </form>
                      )}
                      {entry.consentStatus === "pending" && (
                        <form action={updateEntryAction} className="flex gap-2">
                          <input type="hidden" name="year" value={year} />
                          <input type="hidden" name="entryId" value={entry.id} />
                          <input type="hidden" name="intent" value="record-consent" />
                          <input name="consentNote" placeholder="e.g. signed release, portrait day 12 Mar" maxLength={200} className="w-64 border border-navy/20 px-2 py-1.5 text-[11px]" />
                          <button type="submit" className="border border-navy/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-charcoal/60 hover:border-navy/40">Record consent</button>
                        </form>
                      )}
                      <form action={updateEntryAction}>
                        <input type="hidden" name="year" value={year} />
                        <input type="hidden" name="entryId" value={entry.id} />
                        <input type="hidden" name="intent" value="remove" />
                        <button type="submit" className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-[#9b2c2c] underline underline-offset-4">Remove</button>
                      </form>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
