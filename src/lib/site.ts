import "server-only";
import { headers } from "next/headers";

export function siteUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Trusted origin for gateway callbacks: APP_URL when configured, otherwise the request host. */
export async function requestOrigin(): Promise<string> {
  if (process.env.APP_URL) return siteUrl();
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

/** Public contact address. Set CONTACT_EMAIL; defaults to hello@<APP_URL host>. */
export function contactEmail(): string {
  if (process.env.CONTACT_EMAIL) return process.env.CONTACT_EMAIL;
  try {
    return `hello@${new URL(siteUrl()).hostname.replace(/^www\./, "")}`;
  } catch {
    return "hello@unilagyearbook.com";
  }
}

/** Who operates the platform (plan §4.6). Set OPERATOR_NAME to the legal operator. */
export function operatorName(): string {
  return process.env.OPERATOR_NAME || "the UNILAG Yearbook team";
}
