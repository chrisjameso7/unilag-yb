import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { JoinSteps } from "@/components/join/JoinSteps";
import { Portrait } from "@/components/Portrait";
import { ShareButtons } from "@/components/ShareButtons";
import { Notice } from "@/components/PageHero";
import { requireUser } from "@/lib/auth";
import { loadJourney } from "@/lib/journey";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "You're in the yearbook" };

export default async function PublishedPage() {
  const user = await requireUser("/join/published");
  const j = await loadJourney(user.id);
  if (!j.profile) redirect("/join/profile");
  const p = j.profile;
  const live = p.publicationStatus === "published";

  return (
    <SiteShell>
      <JoinSteps current="live" done={j.done} />
      <section className="container-page max-w-xl py-10 text-center md:py-14">
        {live ? (
          <>
            <p className="eyebrow text-green">You&apos;re in</p>
            <h1 className="display mt-3 text-[clamp(2.5rem,9vw,3.8rem)] text-navy">Welcome to the UNILAG Yearbook.</h1>
            <div className="relative mx-auto mt-8 aspect-[4/5] w-56 overflow-hidden rounded-3xl bg-navy">
              <Portrait name={p.fullName} src={p.portraitPath} seed={p.slug} year={p.graduationYear} sizes="224px" priority />
            </div>
            <p className="display mt-5 text-[1.8rem] text-navy">{p.fullName}</p>
            <p className="mt-1 font-mono text-[0.78rem] text-charcoal/50">/student/{p.slug}</p>
            <div className="mt-6 flex justify-center">
              <ShareButtons title={`I'm in the UNILAG Yearbook — ${p.fullName}`} path={`/student/${p.slug}`} />
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <Link href={`/student/${p.slug}`} className="btn btn-primary">View my page</Link>
              <Link href={`/classes/graduation/${p.graduationYear}`} className="btn btn-ghost text-navy">Find my classmates</Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="display text-[2.4rem] text-navy">{j.paid ? "Payment received." : "Almost there."}</h1>
            <div className="mt-6 text-left">
              <Notice>
                {j.paid && !j.verified
                  ? "Your page will go live automatically as soon as a reviewer confirms your student status. We'll email you."
                  : j.readiness.reasons.join(" ") || "Your page isn't live yet."}
              </Notice>
            </div>
            <Link href="/dashboard" className="btn btn-dark mt-8">Go to My Page</Link>
          </>
        )}
      </section>
    </SiteShell>
  );
}
