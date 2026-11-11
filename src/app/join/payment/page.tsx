import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { JoinSteps } from "@/components/join/JoinSteps";
import { StartPaymentForm } from "@/components/join/PaymentForms";
import { Notice } from "@/components/PageHero";
import { requireUser } from "@/lib/auth";
import { loadJourney } from "@/lib/journey";
import { getEntryFeeKobo } from "@/lib/content";
import { devHarnessEnabled, paystackConfigured } from "@/lib/payments";
import { formatDateTime, formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment" };

export default async function PaymentPage() {
  const user = await requireUser("/join/payment");
  const [j, fee] = await Promise.all([loadJourney(user.id), getEntryFeeKobo()]);
  if (!j.profile) redirect("/join/profile");
  if (j.paid) redirect("/join/published");
  const canPay = j.verified && j.profileComplete && (paystackConfigured() || devHarnessEnabled());
  const attempts = j.payments.filter((p) => p.paymentStatus !== "succeeded").slice(0, 3);

  return (
    <SiteShell>
      <JoinSteps current="pay" done={j.done} />
      <section className="container-page max-w-xl py-10 md:py-14">
        <p className="eyebrow text-green">Step 4</p>
        <h1 className="display mt-3 text-[clamp(2.3rem,8vw,3.4rem)] text-navy">One payment. Permanent.</h1>

        <div className="card mt-6 p-6">
          <p className="display text-[3rem] leading-none text-navy">{formatNaira(fee)}</p>
          <ul className="mt-5 space-y-2 text-[0.9rem] text-charcoal/70">
            <li>✓ Permanent inclusion in the UNILAG Yearbook</li>
            <li>✓ Free edits for the life of the archive</li>
            <li>✓ No subscription, no renewal, no hidden charges</li>
          </ul>
          <div className="mt-6">
            {!j.verified ? (
              <Notice>Payment opens once your student status is verified. <Link href="/join/verify" className="link">Check status</Link></Notice>
            ) : !j.profileComplete ? (
              <Notice>Finish your page first. <Link href="/join/profile" className="link">Continue</Link></Notice>
            ) : !canPay ? (
              <Notice tone="error">Payments aren&apos;t switched on yet. Please check back soon.</Notice>
            ) : (
              <StartPaymentForm label={`Pay ${formatNaira(fee)} securely`} />
            )}
          </div>
          <p className="mt-4 text-center text-[0.75rem] text-charcoal/45">Card, bank transfer or USSD through Paystack. We never see your card details.</p>
        </div>

        {attempts.length > 0 && (
          <div className="mt-8">
            <p className="eyebrow text-charcoal/45">Earlier attempts</p>
            <ul className="mt-2 divide-y divide-navy/10 text-[0.85rem]">
              {attempts.map((p) => (
                <li key={p.id} className="flex justify-between py-2.5">
                  <span className="text-charcoal/60">{formatDateTime(p.createdAt)}</span>
                  <span className="text-charcoal/50">{p.paymentStatus}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.75rem] text-charcoal/45">If you were charged but this page doesn&apos;t show it, don&apos;t pay again — it can take a minute to confirm. Contact us if it doesn&apos;t.</p>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
