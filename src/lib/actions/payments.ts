"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth";
import { devHarnessEnabled, fulfilPayment, getPaymentByReference, startCheckout } from "../payments";
import { consumeRateLimit } from "../rate-limit";
import { requestOrigin } from "../site";
import type { ActionState } from "./types";

export async function startPaymentAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/join/payment");
  const limit = await consumeRateLimit(`checkout:${user.id}`, 8, 3600);
  if (!limit.allowed) {
    return { error: "Too many checkout attempts. Wait a little and try again." };
  }

  const origin = await requestOrigin();
  const result = await startCheckout({ userId: user.id, email: user.email, origin });
  if (!result.ok) return { error: result.error };

  redirect(result.url);
}

/**
 * Local harness only. It is refused in production and requires
 * ALLOW_TEST_PAYMENTS=true. The payment row is recorded as gateway
 * "dev-harness" / mode "test" so the admin console never mistakes it for cash.
 */
export async function confirmTestPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/join/payment");
  if (!devHarnessEnabled()) {
    return { error: "The local payment harness is disabled on this deployment." };
  }

  const reference = String(formData.get("reference") ?? "");
  const payment = await getPaymentByReference(reference);
  if (!payment || payment.user_id !== user.id) {
    return { error: "That payment reference does not belong to your account." };
  }
  if (payment.provider !== "dev-harness") {
    return { error: "This reference is not a local test payment." };
  }

  const result = await fulfilPayment({
    reference,
    amountKobo: payment.amount,
    currency: payment.currency,
    channel: "local-harness",
    provider: "dev-harness",
    mode: "test",
  });

  if (!result.ok) return { error: result.reasons[0] ?? "The test payment could not be completed." };

  revalidatePath("/join/published");
  revalidatePath("/dashboard");
  redirect("/join/published");
}
