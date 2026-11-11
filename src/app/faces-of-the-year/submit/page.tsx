import type { Metadata } from "next";
import Link from "next/link";
/* eslint-disable @next/next/no-img-element -- signed, short-lived private URLs; not for the optimiser */
import { SiteShell } from "@/components/site/SiteShell";
import { FacesSubmissionForm, ReplacePortraitForm } from "@/components/faces/FacesForms";
import { requireUser } from "@/lib/auth";
import { getProfileForUser } from "@/lib/queries";
import { getOpenEdition, getOwnSubmissions } from "@/lib/faces";
import { decideFacesEntryAction, withdrawFacesSubmissionAction } from "@/lib/actions/faces";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Submit for Faces of the Year",
  robots: { index: false, follow: false },
};

const STATUS_COPY: Record<string, string> = {
  submitted: "Received — waiting for the editors.",
  shortlisted: "Shortlisted — the editors are still choosing.",
  selected: "Selected. Review the final portrait and words below.",
  replacement_requested: "The editors asked for a different portrait.",
  declined: "Not selected this year. Your yearbook page is unaffected.",
  withdrawn: "Withdrawn.",
};

export default async function FacesSubmitPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser("/faces-of-the-year/submit");
  const sp = await searchParams;
  const [profile, open] = await Promise.all([getProfileForUser(user.id), getOpenEdition()]);
  const submissions = profile ? await getOwnSubmissions(profile.id) : [];
  const activeForOpen = open
    ? submissions.find((s) => s.editionYear === open.year && !["withdrawn", "declined"].includes(s.status))
    : undefined;

  let blocker: React.ReactNode = null;
  if (!profile) {
    blocker = (
      <>
        Start your yearbook profile first.{" "}
        <Link href="/join" className="text-green underline underline-offset-4">Join the yearbook</Link>
      </>
    );
  } else if (profile.verificationStatus !== "verified") {
    blocker = (
      <>
        Only verified UNILAG students can be considered.{" "}
        <Link href="/join/verify" className="text-green underline underline-offset-4">Finish verification</Link>
      </>
    );
  } else if (!open) {
    blocker = "Submissions are closed right now. We'll open them again for the next edition.";
  }

  return (
    <SiteShell>
      <section className="bg-ivory py-14 md:py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow text-charcoal/40">Faces of the Year</p>
            <h1 className="mt-4 display text-[clamp(2.2rem,4.4vw,3.2rem)] leading-[0.98] tracking-[-0.03em]">
              Be part of the frame.
            </h1>
            <p className="mt-5 max-w-sm text-[13px] leading-relaxed text-charcoal/55">
              Optional, free, and chosen by editors — never by votes or payment. Your ordinary
              yearbook page doesn&apos;t depend on it.
            </p>
            <ul className="mt-6 space-y-2 text-[12px] text-charcoal/55">
              <li>· Portraits are private until you approve publication.</li>
              <li>· You can withdraw at any time, before or after publication.</li>
              <li>
                ·{" "}
                <Link href="/portrait-guide" className="text-green underline underline-offset-4">
                  How to take a good portrait with a phone
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-10">
            {sp.withdrawn === "1" && (
              <p role="status" className="border border-navy/15 bg-paper px-4 py-3 text-[12px] text-charcoal/65">
                Your submission was withdrawn and the photo deleted.
              </p>
            )}

            {blocker ? (
              <p className="border border-navy/15 bg-paper p-5 text-[13px] leading-relaxed text-charcoal/65">{blocker}</p>
            ) : activeForOpen ? (
              <p className="border border-navy/15 bg-paper p-5 text-[13px] leading-relaxed text-charcoal/65">
                You&apos;ve already submitted for {open!.title}. Its status is below.
              </p>
            ) : (
              <div className="border border-navy/15 bg-paper p-6 md:p-8">
                <h2 className="display text-[1.6rem] leading-none">{open!.title}</h2>
                <p className="mb-6 mt-2 text-[12px] text-charcoal/45">Submissions are open.</p>
                <FacesSubmissionForm editionTitle={open!.title} />
              </div>
            )}

            {submissions.length > 0 && (
              <div>
                <h2 className="display text-[1.6rem] leading-none">Your submissions</h2>
                <ul className="mt-5 space-y-4">
                  {submissions.map((s) => (
                    <li key={s.id} className="border border-navy/15 bg-paper p-5">
                      <div className="flex gap-5">
                        {s.imageUrl && (
                          <img
                            src={s.imageUrl}
                            alt="Your submitted portrait"
                            className="h-28 w-[5.6rem] shrink-0 object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10.5px] uppercase tracking-[0.12em] text-charcoal/40">
                            {s.editionYear ? `Faces of ${s.editionYear}` : "Faces of the Year"} · sent{" "}
                            {formatDate(s.submittedAt)}
                          </p>
                          <p className="mt-2 text-[13px] text-charcoal/80">{STATUS_COPY[s.status]}</p>
                          {s.reviewNotes && s.status === "replacement_requested" && (
                            <p className="mt-2 border-l-2 border-[#C9A227] pl-3 text-[12px] text-charcoal/65">
                              Editor&apos;s note: {s.reviewNotes}
                            </p>
                          )}
                          {s.status === "replacement_requested" && <ReplacePortraitForm submissionId={s.id} />}

                          {s.entry && s.entry.consentStatus !== "withdrawn" && (
                            <div className="mt-5 border-t border-navy/10 pt-4">
                              <p className="eyebrow text-charcoal/40">Final entry for your approval</p>
                              <div className="mt-3 flex gap-4">
                                {s.entry.portraitUrl && (
                                  <img src={s.entry.portraitUrl} alt="Final portrait" className="h-32 w-24 shrink-0 object-cover" />
                                )}
                                <div className="text-[12.5px] leading-relaxed text-charcoal/70">
                                  {s.entry.quote && <p className="display text-[1.05rem] text-navy">“{s.entry.quote}”</p>}
                                  <p className="mt-2">{s.entry.editorialIntroduction}</p>
                                </div>
                              </div>
                              {s.entry.consentStatus === "pending" ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <form action={decideFacesEntryAction}>
                                    <input type="hidden" name="entryId" value={s.entry.id} />
                                    <input type="hidden" name="decision" value="grant" />
                                    <button type="submit" className="btn btn-primary !py-2 text-[11px]">
                                      Approve for publication
                                    </button>
                                  </form>
                                  <form action={decideFacesEntryAction}>
                                    <input type="hidden" name="entryId" value={s.entry.id} />
                                    <input type="hidden" name="decision" value="withdraw" />
                                    <button type="submit" className="btn btn-ghost !py-2 text-[11px] text-navy">
                                      Decline
                                    </button>
                                  </form>
                                </div>
                              ) : (
                                <p className="mt-3 text-[11.5px] text-green-deep">
                                  Approved{s.entry.publicationStatus === "published" ? " and published." : " — the editors will publish it with the edition."}
                                </p>
                              )}
                            </div>
                          )}

                          {s.status !== "withdrawn" && (
                            <form action={withdrawFacesSubmissionAction} className="mt-4">
                              <input type="hidden" name="submissionId" value={s.id} />
                              <button
                                type="submit"
                                className="text-[10px] uppercase tracking-[0.1em] text-charcoal/40 underline underline-offset-4 hover:text-[#9b2c2c]"
                              >
                                Withdraw{s.entry?.publicationStatus === "published" ? " and unpublish" : ""}
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
