import "server-only";
import { adminClient } from "./supabase/admin";
import { siteUrl } from "./site";

/*
 * Transactional email (plan §11). Sends through Resend's HTTP API when
 * RESEND_API_KEY and EMAIL_FROM are set; otherwise logs the message so local
 * development works without an email account. Sending never blocks or fails
 * the action that triggered it.
 */

type Message = { subject: string; heading: string; body: string[]; cta?: { label: string; href: string } };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderEmail(m: Message): { html: string; text: string } {
  const paragraphs = m.body.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#33363d">${escapeHtml(p)}</p>`).join("");
  const button = m.cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(m.cta.href)}" style="background:#087b50;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;display:inline-block">${escapeHtml(m.cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f8f6f0;font-family:Inter,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 20px;font-size:11px;letter-spacing:3px;color:#101c35">UNILAG YEARBOOK</p>
<h1 style="margin:0 0 18px;font-family:Georgia,serif;font-weight:400;font-size:28px;line-height:1.15;color:#101c35">${escapeHtml(m.heading)}</h1>
${paragraphs}${button}
<p style="margin:28px 0 0;font-size:12px;color:#8a8d94">Your years. Your people. Your story. — An independent project, not an official University of Lagos publication.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [m.heading, "", ...m.body, ...(m.cta ? ["", `${m.cta.label}: ${m.cta.href}`] : [])].join("\n");
  return { html, text };
}

export async function sendEmail(to: string, message: Message): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const { html, text } = renderEmail(message);
  if (!key || !from) {
    console.info(`[email] (not sent — RESEND_API_KEY/EMAIL_FROM unset) to=${to} subject="${message.subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: message.subject, html, text }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[email] send failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (error) {
    console.error("[email] send failed", error instanceof Error ? error.message : error);
    return false;
  }
}

async function emailFor(userId: string): Promise<string | null> {
  const { data } = await adminClient().from("users").select("email").eq("id", userId).maybeSingle();
  return (data?.email as string | undefined) || null;
}

async function profileSlug(userId: string): Promise<string | null> {
  const { data } = await adminClient().from("student_profiles").select("username").eq("user_id", userId).maybeSingle();
  return (data?.username as string | undefined) ?? null;
}

export async function notifyVerificationDecision(userId: string, approved: boolean, reason?: string | null) {
  const to = await emailFor(userId);
  if (!to) return;
  await sendEmail(
    to,
    approved
      ? {
          subject: "You're verified — finish your yearbook page",
          heading: "You're verified.",
          body: ["Thanks for your patience. Your UNILAG student status is confirmed.", "Finish your page and it goes live in the yearbook."],
          cta: { label: "Continue", href: `${siteUrl()}/join/preview` },
        }
      : {
          subject: "We couldn't verify your student status",
          heading: "We couldn't verify you yet.",
          body: [reason ? `The reviewer's note: ${reason}` : "The reviewer couldn't confirm your student status from what was sent.", "You can submit again with a clearer photo of your student ID."],
          cta: { label: "Try again", href: `${siteUrl()}/join/verify` },
        },
  );
}

export async function notifyPublished(userId: string) {
  const [to, slug] = await Promise.all([emailFor(userId), profileSlug(userId)]);
  if (!to || !slug) return;
  await sendEmail(to, {
    subject: "You're in the UNILAG Yearbook",
    heading: "Welcome to the yearbook.",
    body: ["Your page is live — a permanent place in the story of UNILAG. Share it with your people, and find your classmates."],
    cta: { label: "View my page", href: `${siteUrl()}/student/${slug}` },
  });
}

export async function notifyFacesSelected(profileId: string, editionTitle: string) {
  const { data } = await adminClient().from("student_profiles").select("user_id").eq("id", profileId).maybeSingle();
  const to = data?.user_id ? await emailFor(data.user_id as string) : null;
  if (!to) return;
  await sendEmail(to, {
    subject: `You've been selected for ${editionTitle}`,
    heading: "You're part of the frame.",
    body: [`The editors have selected you for ${editionTitle}.`, "Nothing is published until you approve your final portrait and words."],
    cta: { label: "Review and approve", href: `${siteUrl()}/faces-of-the-year/submit` },
  });
}
