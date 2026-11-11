"use client";

import { useEffect, useState } from "react";

/** Share to WhatsApp, X, or the phone's native share sheet (plan §14). */
export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);
  useEffect(() => setUrl(new URL(path, window.location.origin).toString()), [path]);
  const text = encodeURIComponent(`${title} ${url}`);

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* dismissed */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={nativeShare} className="btn btn-sm btn-dark">
        {copied ? "Link copied" : "Share"}
      </button>
      <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost text-navy">
        WhatsApp
      </a>
      <a href={`https://x.com/intent/post?text=${text}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost text-navy">
        X
      </a>
    </div>
  );
}
