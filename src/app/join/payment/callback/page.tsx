import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { requireUser } from "@/lib/auth";
import { getPaymentByReference, verifyPaystackTransaction } from "@/lib/payments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirming payment", robots: { index: false } };

/** Paystack redirects here. The redirect proves nothing: we ask Paystack directly before recording anything. */
export default async function CallbackPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/join/payment");
  const sp = await searchParams;
  const reference = (typeof sp.reference === "string" && sp.reference) || (typeof sp.trxref === "string" && sp.trxref) || "";

  const payment = reference ? await getPaymentByReference(reference) : null;
  let message = "No payment reference came back from the gateway.";
  if (payment && payment.user_id === user.id) {
    if (payment.payment_status === "succeeded") redirect("/join/published");
    const result = await verifyPaystackTransaction(reference, user.id);
    if (result.ok) redirect("/join/published");
    message = result.error;
  } else if (reference) {
    message = "That payment doesn't belong to this account.";
  }

  return (
    <SiteShell>
      <section className="container-page max-w-xl py-16 text-center">
        <h1 className="display text-[2.4rem] text-navy">We couldn&apos;t confirm that payment yet.</h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-charcoal/65">{message} Nothing has been published.</p>
        <p className="mt-2 text-[0.85rem] text-charcoal/55">If you were charged, don&apos;t pay again — confirmations can take a minute. Refresh this page, or check My Page shortly.</p>
        {reference && <p className="mt-4 font-mono text-[0.75rem] text-charcoal/45">Reference: {reference}</p>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/dashboard" className="btn btn-dark">Go to My Page</Link>
          <Link href="/join/payment" className="btn btn-ghost text-navy">Back to payment</Link>
        </div>
      </section>
    </SiteShell>
  );
}
