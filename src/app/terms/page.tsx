import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { getEntryFeeKobo } from "@/lib/content";
import { formatNaira } from "@/lib/format";
import { contactEmail, operatorName } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Terms", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const fee = await getEntryFeeKobo();
  const email = contactEmail();
  return (
    <SiteShell>
      <article className="container-page prose-page max-w-2xl py-12 md:py-16">
        <p className="eyebrow text-green">Terms</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,8vw,3.6rem)] text-navy">Terms of use</h1>
        <p>Last updated 11 November 2026. These terms apply between you and {operatorName()}, which operates the UNILAG Yearbook.</p>

        <h2>Independence</h2>
        <p>The UNILAG Yearbook is independent. It is not an official publication of, or endorsed by, the University of Lagos.</p>

        <h2>Who can have a page</h2>
        <p>Pages are for current students and graduates of the University of Lagos whose status we have verified. One page per person. Don&apos;t create a page for someone else or submit someone else&apos;s documents.</p>

        <h2>Your page</h2>
        <ul>
          <li>You are responsible for what you write and upload. It must be about you, true, and lawful — no impersonation, hate, harassment, explicit content or other people&apos;s private information.</li>
          <li>You keep ownership of your content. You give us permission to display it in the yearbook and in previews when it is shared, for as long as it is published.</li>
          <li>You can edit your page at any time at no extra cost, hide it, or ask us to remove it.</li>
          <li>We may suspend or remove pages that break these terms or that we reasonably believe are fraudulent, and will tell you why where we can.</li>
        </ul>

        <h2>The publication fee</h2>
        <ul>
          <li>Publishing a page costs a one-time fee of {formatNaira(fee)}, paid through Paystack. There are no subscriptions, renewals or hidden charges, and reasonable edits are always free.</li>
          <li>The fee pays for permanent inclusion in the yearbook — not for temporary access, and never for editorial placement. Faces of the Year selection cannot be bought.</li>
          <li><strong>Refunds:</strong> if you were charged twice, or your page has not been published within 14 days of paying, you can have a full refund. Once your page is published the fee is not refundable, except where the law requires otherwise or where we remove your page without a breach of these terms on your part. Email <a className="link" href={`mailto:${email}`}>{email}</a> with your payment reference.</li>
        </ul>

        <h2>Faces of the Year</h2>
        <p>Taking part is optional and free. Editors choose entries at their discretion, considering range across faculties, departments and generations — never wealth, appearance, social following or payment. Nothing is published without your approval, and you can withdraw at any time. If someone else took your photo, you confirm you have their permission to share it.</p>

        <h2>Preservation</h2>
        <p>We intend the yearbook to last for decades and plan for it with independent backups and a documented recovery process. We cannot promise the service will run forever. If the yearbook ever had to close, we would give notice and offer you a copy of your page.</p>

        <h2>Liability</h2>
        <p>We provide the yearbook with reasonable care and skill. To the extent the law allows, we are not liable for indirect losses, and our total liability to you is limited to the fee you paid.</p>

        <h2>Changes and contact</h2>
        <p>We may update these terms and will tell registered users about significant changes. Questions: <a className="link" href={`mailto:${email}`}>{email}</a>. See also the <Link className="link" href="/privacy">privacy notice</Link>.</p>
      </article>
    </SiteShell>
  );
}
