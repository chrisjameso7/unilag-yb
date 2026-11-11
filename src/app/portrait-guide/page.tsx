import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: "Portrait Studio — how to take your yearbook portrait",
  description:
    "Editorial-quality yearbook portraits with an ordinary phone: framing, light, background, clothing, file requirements and how your photo is used.",
  alternates: { canonical: "/portrait-guide" },
};

/** Simple framing diagram — an illustration, not a photograph of a person. */
function FramingDiagram({ variant }: { variant: "good" | "tight" | "far" | "tilted" }) {
  const scale = variant === "tight" ? 1.55 : variant === "far" ? 0.55 : 1;
  const cy = variant === "far" ? 250 : variant === "tight" ? 230 : 205;
  const rotate = variant === "tilted" ? -14 : 0;
  const ok = variant === "good";
  return (
    <svg viewBox="0 0 320 400" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="400" fill={ok ? "#EDEAE1" : "#E9E6E0"} />
      <g transform={`rotate(${rotate} 160 200) translate(160 ${cy}) scale(${scale}) translate(-160 -205)`}>
        <ellipse cx="160" cy="150" rx="52" ry="64" fill="#101C35" fillOpacity="0.85" />
        <path d="M58 400 C 64 300, 108 262, 160 262 C 212 262, 256 300, 262 400 Z" fill="#101C35" fillOpacity="0.85" />
      </g>
      {ok && (
        <g stroke="#087B50" strokeOpacity="0.65" strokeDasharray="4 5" fill="none">
          <line x1="0" y1="133" x2="320" y2="133" />
          <line x1="0" y1="266" x2="320" y2="266" />
          <line x1="107" y1="0" x2="107" y2="400" />
          <line x1="213" y1="0" x2="213" y2="400" />
        </g>
      )}
      <rect x="0.5" y="0.5" width="319" height="399" fill="none" stroke="#101C35" strokeOpacity="0.15" />
    </svg>
  );
}

const FRAMES = [
  { variant: "good" as const, title: "Head and shoulders", note: "Eyes on the upper third line, a little space above the head, shoulders in frame. Portrait (vertical) orientation.", ok: true },
  { variant: "tight" as const, title: "Too close", note: "Cropped forehead or chin. Step back or zoom out — editors need room to crop.", ok: false },
  { variant: "far" as const, title: "Too far", note: "Mostly background. Your face should fill roughly a third of the frame.", ok: false },
  { variant: "tilted" as const, title: "Tilted", note: "Hold the phone level and at eye height, not from below.", ok: false },
];

const SECTIONS: Array<{ id: string; title: string; points: string[] }> = [
  {
    id: "light",
    title: "Light",
    points: [
      "Face a window in daylight, or stand in open shade outdoors. Soft, even light is the most flattering.",
      "Avoid direct midday sun (hard shadows, squinting) and overhead fluorescent tubes.",
      "Don't stand with a bright window or sky behind you — your face will go dark.",
      "Late afternoon light on campus — around the lagoon front or under trees — is ideal.",
      "Turn the flash off. If it's too dark to shoot without flash, move to better light.",
    ],
  },
  {
    id: "background",
    title: "Background",
    points: [
      "A plain wall, a hedge or an uncluttered campus view works best.",
      "Leave a little distance between you and the wall so it doesn't cast your shadow.",
      "Nothing growing out of your head: check for poles, signs and door frames behind you.",
      "No other people in the frame. If a friend is behind you, crop or reshoot.",
    ],
  },
  {
    id: "clothing",
    title: "Clothing and styling",
    points: [
      "Wear what makes you feel like yourself — native wear, a shirt, your faculty colours. There is no dress code.",
      "Solid colours photograph better than tight stripes or busy logos.",
      "Glasses are fine; tilt your chin down slightly to reduce reflections.",
      "No sunglasses or anything covering your face, unless worn for religious reasons.",
    ],
  },
  {
    id: "phone",
    title: "Using your phone",
    points: [
      "Use the back camera if someone can take it for you — it is sharper than the selfie camera.",
      "Wipe the lens. A fingerprint smudge is the most common reason for a soft photo.",
      "Tap on your face to focus and expose for it.",
      "Portrait mode is fine if the edges look natural; turn it off if hair or ears look cut out.",
      "No beauty filters, face smoothing or heavy colour presets. Editors will grade the edition consistently.",
    ],
  },
];

export default function PortraitGuidePage() {
  return (
    <SiteShell>
      <section className="bg-navy py-16 text-ivory md:py-24">
        <div className="container-page">
          <p className="eyebrow text-ivory/45">Portrait Studio</p>
          <h1 className="display text-[clamp(2.6rem,10vw,5.5rem)] mt-5 max-w-[14ch]">A GOOD PORTRAIT, WITH THE PHONE YOU HAVE.</h1>
          <div className="mt-8 grid gap-8 border-t border-ivory/15 pt-6 md:grid-cols-[1fr_1fr]">
            <p className="max-w-lg text-[13.5px] leading-relaxed text-ivory/60">
              You don&apos;t need a professional photoshoot to be in the yearbook or to be
              considered for Faces of the Year. Ten minutes, good light and this guide are enough.
            </p>
            <nav aria-label="On this page" className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.12em] text-ivory/45 md:justify-self-end">
              {["framing", "light", "background", "clothing", "phone", "files", "examples", "consent"].map((id) => (
                <a key={id} href={`#${id}`} className="hover:text-ivory">
                  {id}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      <section id="framing" className="scroll-mt-24 bg-ivory py-16 md:py-24">
        <div className="container-page">
          <h2 className="display text-[clamp(2rem,4vw,2.8rem)] leading-none tracking-[-0.02em]">Framing</h2>
          <ul className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {FRAMES.map((frame, index) => (
              <li key={frame.variant} className="rise" style={{ animationDelay: `${index * 50}ms` }}>
                <div className={`aspect-[4/5] overflow-hidden rounded-2xl border-2 ${frame.ok ? "border-green" : "border-transparent"}`}>
                  <FramingDiagram variant={frame.variant} />
                </div>
                <p className={`mt-3 text-[10.5px] uppercase tracking-[0.12em] ${frame.ok ? "text-green" : "text-[#9b2c2c]"}`}>
                  {frame.ok ? "Do" : "Avoid"} · {frame.title}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-charcoal/55">{frame.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paper py-16 md:py-24">
        <div className="container-page grid gap-14 md:grid-cols-2">
          {SECTIONS.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="display text-[1.9rem] leading-none tracking-[-0.02em]">{section.title}</h2>
              <ul className="mt-5 space-y-3 border-t border-navy/10 pt-4">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-3 text-[13px] leading-relaxed text-charcoal/65">
                    <span aria-hidden="true" className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-green" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="files" className="scroll-mt-24 bg-ivory py-16">
        <div className="container-page">
          <h2 className="display text-[1.9rem] leading-none tracking-[-0.02em]">File requirements</h2>
          <dl className="mt-8 grid gap-px border border-navy/10 bg-navy/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Format", "JPEG, PNG or WebP. HEIC from iPhone: share as “Most Compatible” or export as JPEG."],
              ["Yearbook page", "Up to 5MB. At least 800 × 1000 pixels."],
              ["Faces of the Year", "Up to 15MB. At least 1600 × 2000 pixels — send the original, not a WhatsApp copy."],
              ["Orientation", "Vertical (portrait). A 4:5 crop is used across the yearbook."],
            ].map(([term, detail]) => (
              <div key={term} className="bg-paper p-5">
                <dt className="eyebrow text-charcoal/40">{term}</dt>
                <dd className="mt-2 text-[12.5px] leading-relaxed text-charcoal/70">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="examples" className="scroll-mt-24 bg-paper py-16">
        <div className="container-page grid gap-10 md:grid-cols-2">
          <div className="border-t-2 border-green pt-5">
            <h2 className="display text-[1.6rem] leading-none">Accepted</h2>
            <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-charcoal/65">
              <li>A clear, recent photo of you alone, face visible and in focus.</li>
              <li>Natural expression — smiling or not, as you like.</li>
              <li>Taken by a friend, by yourself, or by a photographer who agreed to its use.</li>
              <li>Light cropping, straightening and exposure correction.</li>
            </ul>
          </div>
          <div className="border-t-2 border-[#9b2c2c] pt-5">
            <h2 className="display text-[1.6rem] leading-none">Not accepted</h2>
            <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-charcoal/65">
              <li>Group photos, or photos of someone else.</li>
              <li>AI-generated, heavily retouched or face-swapped images.</li>
              <li>Screenshots, photos of printed photos, or images with stickers, text or watermarks.</li>
              <li>Professional photos you don&apos;t have the photographer&apos;s permission to share.</li>
              <li>Anything you wouldn&apos;t want in a permanent archive in twenty years.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="consent" className="scroll-mt-24 bg-navy py-16 text-ivory">
        <div className="container-page grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <h2 className="display text-[2rem] leading-[1.05]">How your photo is used</h2>
          <div className="space-y-4 text-[13px] leading-relaxed text-ivory/65">
            <p>
              <strong className="font-normal text-ivory">Yearbook portrait.</strong> Shown on your
              public yearbook page once it is published. You can replace it from your dashboard at
              any time.
            </p>
            <p>
              <strong className="font-normal text-ivory">Faces of the Year submission.</strong>{" "}
              Stored privately and seen only by the editorial team. If you are not selected, it is
              never published. If you are, you approve the final portrait and words before anything
              goes live, and you can withdraw later.
            </p>
            <p>
              <strong className="font-normal text-ivory">Photographers.</strong> If someone else
              took your photo, make sure they are happy for it to be used. Credits can be added to
              Faces of the Year entries on request.
            </p>
            <p>
              Photos are used only within UNILAG Yearbook, as described in the{" "}
              <Link href="/privacy" className="text-ivory underline underline-offset-4">privacy notice</Link>.
            </p>
            <div className="flex flex-wrap gap-3 pt-3">
              <Link href="/join" className="btn btn-primary">Join the yearbook</Link>
              <Link href="/faces-of-the-year" className="btn btn-ghost text-ivory">Faces of the Year</Link>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
