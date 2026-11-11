import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { adminClient } from "./supabase/admin";
import { getProfileForUser } from "./queries";
import { getEntryFeeKobo } from "./content";
import { notifyPublished } from "./email";

const PAYSTACK_BASE = "https://api.paystack.co";

export type CheckoutStart =
  | { ok: true; url: string; reference: string; mode: "live" | "test" }
  | { ok: false; error: string };

export function paystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

/** Paystack test keys start with sk_test_; their payments are recorded as mode "test". */
function paystackMode(): "live" | "test" {
  return process.env.PAYSTACK_SECRET_KEY?.trim().startsWith("sk_test_") ? "test" : "live";
}

/**
 * A local, clearly-labelled payment harness. It is never available in production
 * and must be switched on explicitly. It exercises the same fulfilment function as
 * the real webhook, but it is NOT a Paystack payment and the UI says so.
 */
export function devHarnessEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_TEST_PAYMENTS === "true";
}

export type PaymentRecord = {
  id: string;
  user_id: string | null;
  amount: number;
  currency: string;
  provider: "paystack" | "dev-harness";
  transaction_reference: string;
  payment_status: "initialized" | "pending" | "succeeded" | "failed" | "refunded";
  mode: "live" | "test";
  payer_email: string;
};

export async function getPaymentByReference(reference: string): Promise<PaymentRecord | null> {
  if (!/^[A-Za-z0-9_.=-]{6,100}$/.test(reference)) return null;
  const { data } = await adminClient()
    .from("payments")
    .select(
      "id, user_id, amount, currency, provider, transaction_reference, payment_status, mode, payer_email",
    )
    .eq("transaction_reference", reference)
    .maybeSingle();
  return (data as PaymentRecord | null) ?? null;
}

async function setStatus(reference: string, status: "failed" | "pending", onlyFrom: string[]) {
  await adminClient()
    .from("payments")
    .update({ payment_status: status })
    .eq("transaction_reference", reference)
    .in("payment_status", onlyFrom);
}

export async function startCheckout(args: {
  userId: string;
  email: string;
  origin: string;
}): Promise<CheckoutStart> {
  const db = adminClient();
  const [fee, profile] = await Promise.all([getEntryFeeKobo(), getProfileForUser(args.userId)]);

  if (!profile) return { ok: false, error: "Create your profile before paying." };
  if (profile.publicationStatus === "published") {
    return { ok: false, error: "Your entry is already published." };
  }
  if (profile.publicationStatus === "suspended" || profile.publicationStatus === "removed") {
    return { ok: false, error: "This entry is on hold. Contact the yearbook team." };
  }
  if (profile.verificationStatus !== "verified") {
    return {
      ok: false,
      error: "Your student verification has not been approved yet. Payment opens once it is.",
    };
  }

  const { data: paid } = await db
    .from("payments")
    .select("id")
    .eq("user_id", args.userId)
    .eq("payment_status", "succeeded")
    .limit(1);
  if (paid && paid.length > 0) {
    return {
      ok: false,
      error: "A confirmed payment already exists for this account. Nothing further is owed.",
    };
  }

  const reference = `uly_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
  const live = paystackConfigured();

  if (!live && !devHarnessEnabled()) {
    return {
      ok: false,
      error:
        "Card payments are not configured on this deployment yet. Add PAYSTACK_SECRET_KEY to enable checkout.",
    };
  }

  const { error: insertError } = await db.from("payments").insert({
    user_id: args.userId,
    provider: live ? "paystack" : "dev-harness",
    transaction_reference: reference,
    amount: fee,
    currency: "NGN",
    payment_status: "initialized",
    payer_email: args.email,
    mode: live ? paystackMode() : "test",
  });
  if (insertError) return { ok: false, error: "Could not start checkout. Try again shortly." };

  await db
    .from("student_profiles")
    .update({ publication_status: "pending_payment" })
    .eq("user_id", args.userId)
    .eq("publication_status", "draft");

  if (!live) {
    return {
      ok: true,
      url: `/join/payment/test?reference=${encodeURIComponent(reference)}`,
      reference,
      mode: "test",
    };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: args.email,
        amount: fee,
        currency: "NGN",
        reference,
        callback_url: `${args.origin}/join/payment/callback`,
        metadata: {
          userId: args.userId,
          profileId: profile.id,
          product: "UNILAG Yearbook entry",
        },
      }),
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; access_code?: string };
    };

    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      await setStatus(reference, "failed", ["initialized"]);
      return {
        ok: false,
        error: payload.message ?? "The payment gateway rejected the checkout. Try again shortly.",
      };
    }

    await db
      .from("payments")
      .update({ access_code: payload.data.access_code ?? null, payment_status: "pending" })
      .eq("transaction_reference", reference);

    return { ok: true, url: payload.data.authorization_url, reference, mode: paystackMode() };
  } catch {
    await setStatus(reference, "failed", ["initialized"]);
    return {
      ok: false,
      error: "Could not reach the payment gateway. Check your connection and try again.",
    };
  }
}

export type FulfilResult = {
  ok: boolean;
  alreadyFulfilled: boolean;
  published: boolean;
  userId: string | null;
  reasons: string[];
};

/**
 * Idempotent fulfilment (public.fulfil_payment): row-locked, checks amount and
 * currency against the stored payment, then publishes if every other condition
 * is met. Safe to call from the webhook and the redirect at the same time.
 */
export async function fulfilPayment(input: {
  reference: string;
  amountKobo: number;
  currency: string;
  channel: string | null;
  provider: "paystack" | "dev-harness";
  mode: "live" | "test";
}): Promise<FulfilResult> {
  const { data, error } = await adminClient().rpc("fulfil_payment", {
    p_reference: input.reference,
    p_amount: input.amountKobo,
    p_currency: input.currency,
    p_channel: input.channel,
    p_provider: input.provider,
    p_mode: input.mode,
  });
  if (error) throw new Error(`[payments] fulfil_payment: ${error.message}`);

  const r = data as {
    ok: boolean;
    reason?: string;
    already_fulfilled?: boolean;
    published?: boolean;
    user_id?: string | null;
    has_verified_student?: boolean;
    has_portrait?: boolean;
    has_biography?: boolean;
    has_consent?: boolean;
  };

  if (r.ok && r.published && !r.already_fulfilled && r.user_id) await notifyPublished(r.user_id);

  const reasons: string[] = [];
  if (!r.ok) reasons.push(r.reason ?? "Payment rejected.");
  if (r.ok && !r.published) {
    if (r.has_verified_student === false) reasons.push("Student verification is not approved yet.");
    if (r.has_portrait === false) reasons.push("A yearbook portrait is required.");
    if (r.has_biography === false) reasons.push("Write at least 20 characters of biography.");
    if (r.has_consent === false) reasons.push("Publication consent has not been given.");
  }
  return {
    ok: r.ok,
    alreadyFulfilled: Boolean(r.already_fulfilled),
    published: Boolean(r.published),
    userId: r.user_id ?? null,
    reasons,
  };
}

type PaystackTransaction = {
  status?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  reference?: string;
  metadata?: { userId?: string } | string | null;
};

/** Ask Paystack directly what happened. Used by both the redirect and the webhook. */
export async function fetchPaystackTransaction(
  reference: string,
): Promise<{ ok: true; data: PaystackTransaction } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, cache: "no-store" },
    );
    const payload = (await response.json()) as {
      status?: boolean;
      data?: PaystackTransaction;
      message?: string;
    };
    if (!response.ok || !payload.status || !payload.data) {
      return { ok: false, error: payload.message ?? "Could not verify the transaction." };
    }
    return { ok: true, data: payload.data };
  } catch {
    return { ok: false, error: "Could not reach Paystack to verify the payment." };
  }
}

/**
 * Server-side confirmation for the browser redirect. The redirect itself proves
 * nothing; we always ask Paystack and check the result against our own record.
 */
export async function verifyPaystackTransaction(reference: string, expectedUserId: string) {
  if (!paystackConfigured()) return { ok: false as const, error: "Paystack is not configured." };
  const payment = await getPaymentByReference(reference);
  if (!payment) return { ok: false as const, error: "Payment reference not found." };
  if (payment.user_id !== expectedUserId) {
    return { ok: false as const, error: "This payment belongs to another account." };
  }

  const verified = await fetchPaystackTransaction(reference);
  if (!verified.ok) return { ok: false as const, error: verified.error };
  const data = verified.data;

  if (data.status !== "success") {
    if (data.status === "failed" || data.status === "abandoned") {
      await setStatus(reference, "failed", ["initialized", "pending"]);
    }
    return { ok: false as const, error: `Payment is ${data.status ?? "not successful"}.` };
  }
  if (data.reference !== payment.transaction_reference) {
    return { ok: false as const, error: "Reference mismatch." };
  }
  const metaUser = typeof data.metadata === "object" && data.metadata ? data.metadata.userId : undefined;
  if (metaUser && metaUser !== payment.user_id) {
    return { ok: false as const, error: "This payment belongs to another account." };
  }

  const result = await fulfilPayment({
    reference,
    amountKobo: Number(data.amount ?? 0),
    currency: String(data.currency ?? ""),
    channel: data.channel ?? null,
    provider: "paystack",
    mode: paystackMode(),
  });
  if (!result.ok) return { ok: false as const, error: result.reasons[0] ?? "Payment rejected." };
  return { ok: true as const, published: result.published, reasons: result.reasons };
}

/* ------------------------------------------------------------- webhook ---- */

/** Paystack signs the raw body with HMAC-SHA512 using the secret key. */
export function isValidPaystackSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const provided = Buffer.from(signature.trim(), "utf8");
  const computed = Buffer.from(expected, "utf8");
  return provided.length === computed.length && timingSafeEqual(provided, computed);
}

export async function markPaymentFailed(reference: string) {
  await setStatus(reference, "failed", ["initialized", "pending"]);
}

export async function markPaymentRefunded(reference: string) {
  await adminClient()
    .from("payments")
    .update({ payment_status: "refunded", refunded_at: new Date().toISOString() })
    .eq("transaction_reference", reference)
    .eq("payment_status", "succeeded");
}
