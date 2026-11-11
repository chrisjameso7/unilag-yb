import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { JoinSteps } from "@/components/join/JoinSteps";
import { ManualVerificationForm } from "@/components/join/ManualVerificationForm";
import { Notice } from "@/components/PageHero";
import { requireUser } from "@/lib/auth";
import { loadJourney } from "@/lib/journey";
import { studidStatus } from "@/lib/studid";
import { startStudidAction } from "@/lib/actions/verification";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify your student status" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/join/verify");
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const j = await loadJourney(user.id);
  const v = j.verification;
  const studid = studidStatus();

  return (
    <SiteShell>
      <JoinSteps current="verify" done={j.done} />
      <section className="container-page max-w-2xl py-10 md:py-14">
        <p className="eyebrow text-green">Step 1</p>
        <h1 className="display mt-3 text-[clamp(2.3rem,8vw,3.4rem)] text-navy">Confirm you&apos;re a UNILAG student</h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-charcoal/65">
          The yearbook is only for real students and graduates. You can write your page while we check.
        </p>

        <div className="mt-6 space-y-4">
          {error && <Notice tone="error">{error}</Notice>}

          {j.verified ? (
            <>
              <Notice tone="success">You&apos;re verified. Thank you.</Notice>
              <Link href={j.profileComplete ? "/join/payment" : "/join/profile"} className="btn btn-primary w-full">
                {j.profileComplete ? "Continue to payment" : "Continue to your page"}
              </Link>
            </>
          ) : v?.status === "pending" ? (
            <>
              <Notice>
                Your request is with a reviewer (sent {formatDateTime(v.createdAt)}). We&apos;ll email you when it&apos;s decided — usually within two days.
              </Notice>
              <Link href={j.profileComplete ? "/join/preview" : "/join/profile"} className="btn btn-primary w-full">
                {j.profileComplete ? "Preview my page" : "Write my page while I wait"}
              </Link>
              <details className="card p-4 text-[0.88rem]">
                <summary className="cursor-pointer text-navy">Sent the wrong photo? Submit again</summary>
                <div className="mt-4"><ManualVerificationForm defaultName={j.profile?.fullName} /></div>
              </details>
            </>
          ) : (
            <>
              {v?.status === "rejected" && (
                <Notice tone="error">
                  Your last request wasn&apos;t approved{v.rejectionReason ? `: ${v.rejectionReason}` : "."} You can try again below.
                </Notice>
              )}
              {studid.configured && (
                <div className="card p-5">
                  <p className="font-medium text-navy">Fastest: sign in with your university account</p>
                  <p className="mt-1 text-[0.85rem] text-charcoal/60">Through Studid. We never see your password.</p>
                  <form action={startStudidAction} className="mt-4">
                    <button type="submit" className="btn btn-dark w-full">Verify with Studid</button>
                  </form>
                </div>
              )}
              <div className="card p-5">
                <p className="mb-4 font-medium text-navy">{studid.configured ? "Or upload your student ID" : "Upload your student ID"}</p>
                <ManualVerificationForm defaultName={j.profile?.fullName} />
              </div>
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
