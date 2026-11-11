import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import {
  fetchPaystackTransaction,
  fulfilPayment,
  getPaymentByReference,
  isValidPaystackSignature,
  markPaymentFailed,
  markPaymentRefunded,
} from "@/lib/payments";
import { logAudit } from "@/lib/profile-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PaystackEvent = {
  event?: string;
  data?: {
    id?: number | string;
    reference?: string;
    transaction_reference?: string;
    status?: string;
  };
};

/**
 * Paystack webhook (Dashboard → Settings → API Keys & Webhooks →
 * https://<your-domain>/api/webhooks/paystack).
 *
 *  1. The raw body must carry a valid HMAC-SHA512 `x-paystack-signature`.
 *  2. Every event is stored once in payment_events (unique event_key) — retries
 *     and duplicates are acknowledged without being processed twice.
 *  3. For charge.success we still ask Paystack's verify endpoint for the
 *     authoritative amount and status, then run the same locked fulfilment
 *     function the redirect uses.
 *  4. Any unexpected failure returns 500 so Paystack retries; the event row is
 *     left unprocessed so the retry picks it up.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!isValidPaystackSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const type = String(event.event ?? "unknown");
  const reference = event.data?.reference ?? event.data?.transaction_reference ?? null;
  const eventKey = `paystack:${type}:${event.data?.id ?? reference ?? "none"}`;
  const db = adminClient();

  const inserted = await db.from("payment_events").insert({
    provider: "paystack",
    event_key: eventKey,
    event_type: type,
    transaction_reference: reference,
    payload: event,
  });
  if (inserted.error) {
    if (inserted.error.code !== "23505") {
      console.error("[webhook] could not store event", inserted.error.message);
      return NextResponse.json({ error: "storage" }, { status: 500 });
    }
    const { data: existing } = await db
      .from("payment_events")
      .select("processed_at")
      .eq("event_key", eventKey)
      .maybeSingle();
    if (existing?.processed_at) return NextResponse.json({ received: true, duplicate: true });
    // A previous attempt failed part-way: fall through and process again (fulfilment is idempotent).
  }

  const finish = async (result: string) => {
    await db
      .from("payment_events")
      .update({ processing_result: result.slice(0, 500), processed_at: new Date().toISOString() })
      .eq("event_key", eventKey);
    return NextResponse.json({ received: true });
  };

  try {
    if (!reference) return await finish("ignored: no reference");
    const payment = await getPaymentByReference(reference);
    if (!payment) return await finish("ignored: unknown reference");

    switch (type) {
      case "charge.success": {
        const verified = await fetchPaystackTransaction(reference);
        if (!verified.ok) throw new Error(verified.error); // retry later
        if (verified.data.status !== "success") {
          return await finish(`not fulfilled: verify status ${verified.data.status}`);
        }
        const result = await fulfilPayment({
          reference,
          amountKobo: Number(verified.data.amount ?? 0),
          currency: String(verified.data.currency ?? ""),
          channel: verified.data.channel ?? null,
          provider: "paystack",
          mode: payment.mode,
        });
        if (!result.ok) {
          await logAudit(null, "payment.rejected", "payment", reference, result.reasons.join(" "));
          return await finish(`rejected: ${result.reasons.join(" ")}`);
        }
        if (!result.alreadyFulfilled) {
          await logAudit(
            null,
            "payment.succeeded",
            "payment",
            reference,
            result.published ? "Webhook confirmed; entry published." : `Webhook confirmed; not yet published: ${result.reasons.join(" ")}`,
          );
          if (result.published) {
            revalidatePath("/");
            revalidatePath("/students");
            revalidatePath("/classes");
          }
        }
        return await finish(result.alreadyFulfilled ? "already fulfilled" : result.published ? "fulfilled; published" : "fulfilled");
      }

      case "charge.failed": {
        await markPaymentFailed(reference);
        return await finish("marked failed");
      }

      case "refund.processed": {
        await markPaymentRefunded(reference);
        await logAudit(null, "payment.refunded", "payment", reference, "Paystack reported the refund as processed.");
        return await finish("marked refunded");
      }

      default:
        return await finish(`ignored: ${type}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[webhook] processing failed", type, reference, message);
    await db
      .from("payment_events")
      .update({ processing_result: `error: ${message}`.slice(0, 500) })
      .eq("event_key", eventKey);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
