import { supabaseUrl } from "./env";

export const BUCKETS = {
  portraits: "portraits",
  verificationDocuments: "verification-documents",
  editorialSubmissions: "editorial-submissions",
} as const;

/**
 * Public URL for an object in the public portraits bucket. The database stores
 * only the object key, so the archive can move storage providers (for example to
 * Cloudflare R2) without rewriting a single row.
 */
export function portraitUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http")) return key;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl()}/storage/v1/object/public/${BUCKETS.portraits}/${encoded}`;
}
