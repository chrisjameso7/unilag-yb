import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { adminClient } from "./supabase/admin";

export type AdminRole = "admin" | "reviewer" | "editor";

export type Permission =
  | "verifications"
  | "students"
  | "payments"
  | "requests"
  | "content"
  | "cohorts"
  | "faces"
  | "audit";

/** Role-based access for the admin console (plan §9). */
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  admin: ["verifications", "students", "payments", "requests", "content", "cohorts", "faces", "audit"],
  reviewer: ["verifications", "students", "requests", "audit"],
  editor: ["faces", "content", "cohorts"],
};

export type SessionUser = {
  id: string;
  email: string;
  /** "admin" for any console role; kept for the existing UI checks. */
  role: "student" | "admin";
  adminRole: AdminRole | null;
  permissions: Permission[];
  accountStatus: "active" | "suspended" | "deleted";
  emailConfirmed: boolean;
  createdAt: string;
};

export function can(user: SessionUser | null, permission: Permission): boolean {
  return Boolean(user?.permissions.includes(permission));
}

/**
 * The signed-in user, validated against Supabase Auth on every request
 * (`getUser()` checks the JWT with the auth server; cookies alone are not trusted).
 * Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const db = adminClient();
  const [{ data: adminRow }, { data: account }] = await Promise.all([
    db.from("admin_users").select("role").eq("user_id", user.id).maybeSingle(),
    db.from("users").select("account_status").eq("id", user.id).maybeSingle(),
  ]);

  const adminRole = (adminRow?.role as AdminRole | undefined) ?? null;
  return {
    id: user.id,
    email: user.email ?? "",
    role: adminRole ? "admin" : "student",
    adminRole,
    permissions: adminRole ? ROLE_PERMISSIONS[adminRole] : [],
    accountStatus: (account?.account_status as SessionUser["accountStatus"]) ?? "active",
    emailConfirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at,
  };
});

export async function requireUser(nextPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (user.accountStatus !== "active") redirect("/login?error=account-suspended");
  return user;
}

export async function requireAdmin(
  nextPath = "/admin",
  permission?: Permission,
): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}&admin=1`);
  if (user.accountStatus !== "active") redirect("/login?error=account-suspended");
  if (!user.adminRole) redirect("/dashboard?error=admin-only");
  if (permission && !user.permissions.includes(permission)) redirect("/admin?error=forbidden");
  return user;
}
