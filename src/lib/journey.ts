import "server-only";
import { getPaymentsForUser, getProfileForUser, getVerificationForUser } from "./queries";
import { publicationReadiness } from "./publish";

export type JourneyStep = "verify" | "profile" | "preview" | "pay" | "live";

/** Everything the join flow needs to know about one student, loaded in parallel. */
export async function loadJourney(userId: string) {
  const [profile, verification, payments, readiness] = await Promise.all([
    getProfileForUser(userId),
    getVerificationForUser(userId),
    getPaymentsForUser(userId),
    publicationReadiness(userId),
  ]);
  const paid = payments.find((p) => p.paymentStatus === "succeeded") ?? null;
  const verified = readiness.hasVerifiedStudent;
  const profileComplete = Boolean(profile) && readiness.hasPortrait && readiness.hasBiography && readiness.hasConsent;

  const done: JourneyStep[] = [];
  if (verified) done.push("verify");
  if (profileComplete) done.push("profile", "preview");
  if (paid) done.push("pay");
  if (profile?.publicationStatus === "published") done.push("live");

  // Students may write their profile while verification is pending, so "profile"
  // comes before "verify" once a request has been sent.
  let next: JourneyStep;
  if (profile?.publicationStatus === "published") next = "live";
  else if (!verification || verification.status === "rejected" || verification.status === "expired") next = "verify";
  else if (!profileComplete) next = "profile";
  else if (!verified) next = "verify";
  else if (!paid) next = "pay";
  else next = "live";

  return { profile, verification, payments, paid, readiness, verified, profileComplete, done, next };
}

export const STEP_HREF: Record<JourneyStep, string> = {
  verify: "/join/verify",
  profile: "/join/profile",
  preview: "/join/preview",
  pay: "/join/payment",
  live: "/join/published",
};
