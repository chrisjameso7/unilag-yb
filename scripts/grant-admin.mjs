#!/usr/bin/env node
/**
 * Grant or revoke an admin-console role.
 *
 *   npm run admin:grant -- someone@example.com admin
 *   npm run admin:grant -- someone@example.com reviewer
 *   npm run admin:grant -- someone@example.com editor
 *   npm run admin:grant -- someone@example.com --revoke
 *
 * Roles: admin (everything, incl. payments/refunds), reviewer (verifications,
 * students, requests), editor (Faces of the Year, content, cohorts).
 *
 * The person must already have signed up (and confirmed their email). There
 * are no built-in or demo admin accounts — credentials never live in the repo.
 */
import { createClient } from "@supabase/supabase-js";

const [email, roleArg] = process.argv.slice(2);
const ROLES = ["admin", "reviewer", "editor"];

if (!email || !roleArg || (!ROLES.includes(roleArg) && roleArg !== "--revoke")) {
  console.error("Usage: npm run admin:grant -- <email> <admin|reviewer|editor|--revoke>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env.local).");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: user, error } = await db
  .from("users")
  .select("id, email")
  .ilike("email", email.trim())
  .maybeSingle();
if (error) {
  console.error("Lookup failed:", error.message);
  process.exit(1);
}
if (!user) {
  console.error(`No account for ${email}. Ask them to sign up first.`);
  process.exit(1);
}

if (roleArg === "--revoke") {
  const { error: delError } = await db.from("admin_users").delete().eq("user_id", user.id);
  if (delError) {
    console.error("Revoke failed:", delError.message);
    process.exit(1);
  }
  await db.from("audit_logs").insert({ action: "admin.role_revoked", target_type: "user", target_id: user.id, detail: "via scripts/grant-admin.mjs" });
  console.log(`Revoked console access for ${user.email}.`);
} else {
  const { error: upError } = await db
    .from("admin_users")
    .upsert({ user_id: user.id, role: roleArg }, { onConflict: "user_id" });
  if (upError) {
    console.error("Grant failed:", upError.message);
    process.exit(1);
  }
  await db.from("audit_logs").insert({ action: "admin.role_granted", target_type: "user", target_id: user.id, detail: `${roleArg} via scripts/grant-admin.mjs` });
  console.log(`${user.email} is now ${roleArg}.`);
}
