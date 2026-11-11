import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="container-page flex min-h-[60dvh] flex-col items-start justify-center py-16">
        <p className="eyebrow text-green">404</p>
        <h1 className="display mt-3 text-[clamp(2.6rem,10vw,5rem)] text-navy">This page isn&apos;t in the yearbook.</h1>
        <p className="mt-4 max-w-md text-charcoal/65">It may have been moved, hidden by its owner, or never existed.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/students" className="btn btn-dark">Search students</Link>
          <Link href="/" className="btn btn-ghost text-navy">Home</Link>
        </div>
      </section>
    </SiteShell>
  );
}
