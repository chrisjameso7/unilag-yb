import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { JoinSteps } from "@/components/join/JoinSteps";
import { ProfileForm } from "@/components/join/ProfileForm";
import { Notice } from "@/components/PageHero";
import { requireUser } from "@/lib/auth";
import { loadJourney } from "@/lib/journey";
import { getFacultyTree } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Write your page" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/join/profile");
  const sp = await searchParams;
  const [j, faculties] = await Promise.all([loadJourney(user.id), getFacultyTree()]);

  return (
    <SiteShell>
      <JoinSteps current="profile" done={j.done} />
      <section className="container-page max-w-2xl py-10 md:py-14">
        <p className="eyebrow text-green">Step 2</p>
        <h1 className="display mt-3 text-[clamp(2.3rem,8vw,3.4rem)] text-navy">{j.profile ? "Edit your page" : "Write your page"}</h1>
        <p className="mb-6 mt-3 text-[0.95rem] leading-relaxed text-charcoal/65">This is what classmates will find, now and years from now.</p>
        {sp.verification === "submitted" && <div className="mb-6"><Notice tone="success">Verification request sent. Write your page while a reviewer checks it.</Notice></div>}
        <ProfileForm faculties={faculties} profile={j.profile} />
      </section>
    </SiteShell>
  );
}
