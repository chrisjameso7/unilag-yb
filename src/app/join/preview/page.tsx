import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { JoinSteps } from "@/components/join/JoinSteps";
import { Portrait } from "@/components/Portrait";
import { requireUser } from "@/lib/auth";
import { loadJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preview your page" };

export default async function PreviewPage() {
  const user = await requireUser("/join/preview");
  const j = await loadJourney(user.id);
  if (!j.profile) redirect("/join/profile");
  const p = j.profile;
  const checks: Array<[string, boolean, string]> = [
    ["Student status verified", j.readiness.hasVerifiedStudent, "/join/verify"],
    ["Portrait added", j.readiness.hasPortrait, "/join/profile"],
    ["Line about you written", j.readiness.hasBiography, "/join/profile"],
    ["Publication consent given", j.readiness.hasConsent, "/join/profile"],
    ["Payment confirmed", j.readiness.hasPaid, "/join/payment"],
  ];

  return (
    <SiteShell>
      <JoinSteps current="preview" done={j.done} />
      <section className="container-page grid max-w-5xl gap-10 py-10 md:grid-cols-[0.9fr_1.1fr] md:py-14">
        <div>
          <p className="eyebrow text-green">Step 3 · Preview</p>
          <div className="relative mt-4 aspect-[4/5] overflow-hidden rounded-3xl bg-navy">
            <Portrait name={p.fullName} src={p.portraitPath} seed={p.slug} year={p.graduationYear} sizes="(max-width: 768px) 100vw, 40vw" priority />
          </div>
          <h1 className="display mt-5 text-[2.6rem] leading-none text-navy">{p.fullName}</h1>
          <p className="mt-2 text-[0.9rem] text-charcoal/60">{p.departmentName} · {p.facultyName} · {p.admissionYear}–{p.graduationYear}</p>
          {p.biography && <p className="display mt-5 text-[1.4rem] leading-snug text-charcoal/80">“{p.biography}”</p>}
          <Link href="/join/profile" className="btn btn-ghost mt-6 w-full text-navy sm:w-auto">Edit</Link>
        </div>

        <div>
          <h2 className="display text-[2rem] text-navy">Ready to go live?</h2>
          <ul className="mt-5 divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-paper">
            {checks.map(([label, ok, href]) => (
              <li key={label} className="flex min-h-14 items-center justify-between gap-3 px-4">
                <span className="flex items-center gap-3 text-[0.92rem]">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[0.75rem] ${ok ? "bg-green text-white" : "border border-navy/20"}`} aria-hidden="true">{ok ? "✓" : ""}</span>
                  <span className={ok ? "text-charcoal/80" : "text-navy"}>{label}</span>
                  <span className="sr-only">{ok ? "done" : "to do"}</span>
                </span>
                {!ok && <Link href={href} className="link text-[0.82rem]">Do this</Link>}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[0.82rem] leading-relaxed text-charcoal/55">
            Your page publishes automatically the moment every item is ticked. Payment opens once your student status is verified.
          </p>
          {!j.readiness.hasPaid && (
            <Link href="/join/payment" className="btn btn-primary mt-6 w-full">Continue to payment</Link>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
