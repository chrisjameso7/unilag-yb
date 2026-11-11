"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Permission } from "@/lib/auth";

const LINKS: Array<{
  href: string;
  label: string;
  exact?: boolean;
  badge?: "pending" | "requests" | "submissions";
  permission?: Permission;
}> = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/verifications", label: "Verifications", badge: "pending", permission: "verifications" },
  { href: "/admin/students", label: "Students", permission: "students" },
  { href: "/admin/payments", label: "Payments", permission: "payments" },
  { href: "/admin/requests", label: "Requests", badge: "requests", permission: "requests" },
  { href: "/admin/faces", label: "Faces of the Year", badge: "submissions", permission: "faces" },
  { href: "/admin/content", label: "Content", permission: "content" },
  { href: "/admin/cohorts", label: "Cohorts", permission: "cohorts" },
  { href: "/admin/audit", label: "Audit log", permission: "audit" },
];

export function AdminNav({
  pendingVerifications,
  openRequests,
  openSubmissions,
  permissions,
}: {
  pendingVerifications: number;
  openRequests: number;
  openSubmissions: number;
  permissions: Permission[];
}) {
  const pathname = usePathname();
  const visible = LINKS.filter((link) => !link.permission || permissions.includes(link.permission));

  return (
    <nav aria-label="Admin sections" className="lg:sticky lg:top-[73px]">
      <ul className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:gap-0.5 lg:px-3 lg:py-6">
        {visible.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          const badge =
            link.badge === "pending"
              ? pendingVerifications
              : link.badge === "requests"
                ? openRequests
                : link.badge === "submissions"
                  ? openSubmissions
                  : 0;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-3 whitespace-nowrap px-3 py-2.5 text-[12px] transition-colors ${
                  active
                    ? "bg-navy text-ivory"
                    : "text-charcoal/55 hover:bg-navy/[0.04] hover:text-navy"
                }`}
              >
                {link.label}
                {badge > 0 && (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[9.5px] tabular ${
                      active ? "bg-ivory/20 text-ivory" : "bg-[#C9A227]/20 text-[#7d6410]"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
