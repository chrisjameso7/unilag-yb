import "server-only";
import { adminClient } from "./supabase/admin";

export type Readiness = {
  ready: boolean;
  reasons: string[];
  hasVerifiedStudent: boolean;
  hasConsent: boolean;
  hasPortrait: boolean;
  hasBiography: boolean;
  hasPaid: boolean;
};

type ReadinessRow = {
  has_profile: boolean;
  publication_status: string | null;
  has_verified_student: boolean;
  has_portrait: boolean;
  has_biography: boolean;
  has_consent: boolean;
  has_paid: boolean;
  published?: boolean;
  blocked?: boolean;
};

function toReadiness(row: ReadinessRow): Readiness {
  if (!row.has_profile) {
    return {
      ready: false,
      reasons: ["No profile has been started for this account."],
      hasVerifiedStudent: row.has_verified_student,
      hasConsent: false,
      hasPortrait: false,
      hasBiography: false,
      hasPaid: row.has_paid,
    };
  }
  const reasons: string[] = [];
  if (!row.has_verified_student) reasons.push("Student verification is not approved yet.");
  if (!row.has_portrait) reasons.push("A yearbook portrait is required.");
  if (!row.has_biography) reasons.push("Write at least 20 characters of biography.");
  if (!row.has_consent) reasons.push("Publication consent has not been given.");
  if (!row.has_paid) reasons.push("Entry payment has not been confirmed by the gateway.");
  return {
    ready: reasons.length === 0,
    reasons,
    hasVerifiedStudent: row.has_verified_student,
    hasConsent: row.has_consent,
    hasPortrait: row.has_portrait,
    hasBiography: row.has_biography,
    hasPaid: row.has_paid,
  };
}

/**
 * The single publication gate (public.publication_readiness). The payment
 * webhook, the payment callback, admin review and the dashboard all use the
 * same database function, so a profile can never become public on the
 * browser's word alone.
 */
export async function publicationReadiness(userId: string): Promise<Readiness> {
  const { data, error } = await adminClient().rpc("publication_readiness", { p_user_id: userId });
  if (error) throw new Error(`[publish] readiness: ${error.message}`);
  return toReadiness(data as ReadinessRow);
}

/**
 * Publish if, and only if, every condition is met. Runs in one transaction with
 * the profile row locked (public.publish_profile_if_ready). Suspended and
 * removed profiles are never republished automatically.
 */
export async function publishProfile(
  userId: string,
): Promise<{ published: boolean; blocked: boolean; reasons: string[] }> {
  const { data, error } = await adminClient().rpc("publish_profile_if_ready", {
    p_user_id: userId,
  });
  if (error) throw new Error(`[publish] publish: ${error.message}`);
  const row = data as ReadinessRow;
  const readiness = toReadiness(row);
  if (row.blocked) {
    return {
      published: false,
      blocked: true,
      reasons: ["This profile is suspended or removed. Restore it from the admin console first."],
    };
  }
  return {
    published: Boolean(row.published),
    blocked: false,
    reasons: row.published ? [] : readiness.reasons,
  };
}

/** Called after verification is approved: publishes if payment and profile are already done. */
export const tryPublishAfterVerification = publishProfile;
