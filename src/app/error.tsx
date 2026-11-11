"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="container-page flex min-h-dvh flex-col items-start justify-center py-16">
      <p className="eyebrow text-green">Something went wrong</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,9vw,4.4rem)] text-navy">We couldn&apos;t load this page.</h1>
      <p className="mt-4 max-w-md text-charcoal/65">It&apos;s probably temporary. Try again in a moment.</p>
      {error.digest && <p className="mt-2 font-mono text-[0.72rem] text-charcoal/40">Ref: {error.digest}</p>}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="btn btn-dark">Try again</button>
        <Link href="/" className="btn btn-ghost text-navy">Home</Link>
      </div>
    </main>
  );
}
