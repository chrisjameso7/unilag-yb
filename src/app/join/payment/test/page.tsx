import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { TestPaymentForm } from "@/components/join/PaymentForms";
import { requireUser } from "@/lib/auth";
import { devHarnessEnabled, getPaymentByReference } from "@/lib/payments";
import { formatNaira } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Local test payment", robots: { index: false } };

/** Development only (ALLOW_TEST_PAYMENTS=true and NODE_ENV!=production). Not a real payment. */
export default async function TestPaymentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!devHarnessEnabled()) notFound();
  const user = await requireUser("/join/payment");
  const sp = await searchParams;
  const reference = typeof sp.reference === "string" ? sp.reference : "";
  const payment = await getPaymentByReference(reference);
  if (!payment || payment.user_id !== user.id) notFound();
  if (payment.payment_status === "succeeded") redirect("/join/published");

  return (
    <SiteShell>
      <section className="container-page max-w-md py-14">
        <p className="eyebrow text-amber">Development harness</p>
        <h1 className="display mt-3 text-[2.4rem] text-navy">This is not a real payment.</h1>
        <p className="mt-3 text-[0.9rem] leading-relaxed text-charcoal/65">
          Paystack isn&apos;t configured here. Recording this marks the {formatNaira(payment.amount)} fee as a <strong>test</strong> payment so you can try the rest of the flow. It never counts as revenue and is disabled in production.
        </p>
        <p className="mb-6 mt-3 font-mono text-[0.75rem] text-charcoal/45">{payment.transaction_reference}</p>
        <TestPaymentForm reference={reference} />
      </section>
    </SiteShell>
  );
}
