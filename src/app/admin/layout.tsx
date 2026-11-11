import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getAdminOverview } from "@/lib/queries";
import { Wordmark } from "@/components/site/Header";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAction } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · UNILAG Yearbook" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin("/admin");
  const overview = await getAdminOverview();

  return (
    <div className="min-h-screen bg-ivory">
      <header className="sticky top-0 z-40 border-b border-ivory/10 bg-navy text-ivory">
        <div className="flex h-[73px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Wordmark light />
            <span className="hidden border-l border-ivory/20 pl-4 text-[10px] uppercase tracking-[0.16em] text-ivory/45 sm:block">
              Admin console
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-[10.5px] uppercase tracking-[0.12em] text-ivory/55 hover:text-ivory"
            >
              View site
            </Link>
            <span className="hidden text-[11px] text-ivory/45 md:block">{admin.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-[10.5px] uppercase tracking-[0.12em] text-ivory/55 hover:text-ivory"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="border-b border-navy/10 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r">
          <AdminNav
            pendingVerifications={overview.pendingVerifications}
            openRequests={overview.openRequests}
            openSubmissions={overview.openSubmissions}
            permissions={admin.permissions}
          />
          <div className="hidden border-t border-navy/10 p-4 lg:block">
            <p className="text-[9px] uppercase tracking-[0.14em] text-charcoal/30">Environment</p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-charcoal/40">
              {process.env.NODE_ENV === "production" ? "Production" : "Development"} · role:{" "}
              {admin.adminRole}
            </p>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-8 md:px-7 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
