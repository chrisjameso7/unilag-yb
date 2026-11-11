import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { getCurrentUser } from "@/lib/auth";
import { getEntryFeeKobo } from "@/lib/content";
import { loadJourney, STEP_HREF } from "@/lib/journey";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Join the Yearbook",
  description: "Create your permanent page in the UNILAG Yearbook. Verified students, one payment, lifetime edits.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/join" },
};

const STEPS = [
  ["Create an account", "Your email and a password. Two minutes."],
  ["Verify you're a UNILAG student", "Upload a photo of your student ID. A reviewer confirms it — usually within two days."],
  ["Write your page", "Your portrait, faculty, department, years and a line about you. Preview it before anything goes public."],
  ["Pay once", "A single payment for permanent inclusion. No subscriptions, no hidden charges, free edits for life."],
  ["You're in the yearbook", "A permanent page you can share — and find again in twenty years."],
];

export default async function JoinPage() {
  const [user, fee] = await Promise.all([getCurrentUser(), getEntryFeeKobo()]);
  const journey = user ? await loadJourney(user.id) : null;
  const cta = !user
    ? { href: "/signup?next=%2Fjoin%2Fverify", label: "Start my page" }
    : journey!.next === "live" && journey!.profile?.publicationStatus === "published"
      ? { href: `/student/${journey!.profile.slug}`, label: "View my page" }
      : { href: STEP_HREF[journey!.next], label: "Continue where I left off" };

  return (
    <SiteShell>
      <section className="bg-navy text-ivory">
        <div className="container-page py-12 md:py-20">
          <p className="eyebrow text-ivory/50">Join the Yearbook</p>
          <h1 className="display mt-4 max-w-[13ch] text-[clamp(2.8rem,11vw,6rem)]">Your years. Your people. Your story.</h1>
          <p className="mt-6 max-w-md text-[1rem] leading-relaxed text-ivory/70">
            Everyone gets a page. It stays in the archive after you graduate, and you can edit it whenever you like.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={cta.href} className="btn btn-primary">{cta.label}</Link>
            {!user && <Link href="/login?next=%2Fjoin" className="btn btn-ghost text-ivory">I already have an account</Link>}
          </div>
          <p className="mt-6 text-[0.85rem] text-ivory/55">
            <span className="display text-[1.6rem] text-ivory">{formatNaira(fee)}</span> once · permanent inclusion
          </p>
        </div>
      </section>

      <section className="container-page py-14 md:py-20">
        <h2 className="display text-[2.2rem] text-navy">How it works</h2>
        <ol className="mt-8 space-y-px overflow-hidden rounded-2xl border border-navy/10 bg-navy/10">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-4 bg-paper p-5">
              <span className="display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-[1.1rem] text-ivory">{i + 1}</span>
              <div>
                <p className="font-medium text-navy">{title}</p>
                <p className="mt-1 text-[0.88rem] leading-relaxed text-charcoal/60">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["What's public", "Your name, portrait, faculty, department, years and your line. Nothing else."],
            ["What stays private", "Your email, student ID, matric number and payment details. Always."],
            ["Faces of the Year", "Optional and free. Being considered never affects your page."],
          ].map(([t, b]) => (
            <div key={t} className="card p-5">
              <p className="font-medium text-navy">{t}</p>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-charcoal/60">{b}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
