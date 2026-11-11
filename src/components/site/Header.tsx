"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/actions/auth";

const NAV = [
  { href: "/students", label: "Students" },
  { href: "/classes", label: "Classes" },
  { href: "/faces-of-the-year", label: "Faces of the Year" },
  { href: "/about", label: "About" },
];

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`flex items-baseline gap-1.5 ${light ? "text-ivory" : "text-navy"}`} aria-label="UNILAG Yearbook — home">
      <span className="display text-[1.45rem] leading-none">UNILAG</span>
      <span className="eyebrow text-[0.62rem] opacity-70">Yearbook</span>
    </Link>
  );
}

export function Header({ user }: { user: { email: string; isAdmin: boolean } | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-ivory/90 backdrop-blur supports-[backdrop-filter]:bg-ivory/75">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Wordmark />

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className={`text-[0.875rem] transition-colors ${active(item.href) ? "text-navy" : "text-navy/55 hover:text-navy"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Link href={user.isAdmin ? "/admin" : "/dashboard"} className="btn btn-sm btn-ghost hidden text-navy sm:inline-flex">
              {user.isAdmin ? "Admin" : "My Page"}
            </Link>
          ) : (
            <Link href="/login" className="btn btn-sm hidden text-navy/70 hover:text-navy sm:inline-flex">
              Sign in
            </Link>
          )}
          <Link href="/join" className="btn btn-sm btn-primary">
            Join<span className="hidden sm:inline">&nbsp;the Yearbook</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-navy lg:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>
    </header>

      {/* Rendered outside <header>: the header's backdrop-filter would otherwise trap this fixed panel inside it. */}
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto bg-ivory lg:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col py-4">
            {[{ href: "/", label: "Home" }, ...NAV, { href: "/portrait-guide", label: "Portrait guide" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="display flex items-center justify-between border-b border-navy/10 py-4 text-[2rem] text-navy"
              >
                {item.label}
                <span aria-hidden="true" className="text-base text-navy/30">→</span>
              </Link>
            ))}
          </nav>
          <div className="container-page safe-bottom flex flex-col gap-3 pb-8">
            <Link href="/join" className="btn btn-primary w-full">Join the Yearbook</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="btn btn-ghost w-full text-navy">My Page</Link>
                {user.isAdmin && <Link href="/admin" className="btn btn-ghost w-full text-navy">Admin</Link>}
                <form action={logoutAction}>
                  <button type="submit" className="btn w-full text-navy/60">Sign out</button>
                </form>
              </>
            ) : (
              <Link href="/login" className="btn btn-ghost w-full text-navy">Sign in</Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
