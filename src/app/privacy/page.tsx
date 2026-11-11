import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { contactEmail, operatorName } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy notice", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  const email = contactEmail();
  return (
    <SiteShell>
      <article className="container-page prose-page max-w-2xl py-12 md:py-16">
        <p className="eyebrow text-green">Privacy</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,8vw,3.6rem)] text-navy">Privacy notice</h1>
        <p>Last updated 11 November 2026. This notice explains what the UNILAG Yearbook, operated by {operatorName()}, collects, why, and the choices you have.</p>

        <h2>What is public</h2>
        <p>Once you publish, your page shows your name, portrait, faculty, department, admission and graduation years, graduation status and the line you wrote about yourself. If you are selected for Faces of the Year and approve it, your editorial portrait and the words you approved are also public.</p>

        <h2>What stays private</h2>
        <ul>
          <li><strong>Account:</strong> your email address and password (passwords are stored hashed by our authentication provider; we never see them).</li>
          <li><strong>Verification:</strong> the name and matriculation number you enter and the photo of your student ID. Reviewers see the ID through a link that expires after two minutes, every view is logged, and the file is deleted as soon as a decision is made. We keep a record that you were verified, and when.</li>
          <li><strong>Payments:</strong> the amount, status and reference of your payment. Card and bank details are handled by Paystack; we never receive them.</li>
          <li><strong>Faces submissions:</strong> photos and introductions you submit are seen only by the editors unless you are selected and approve publication. Withdrawn submissions are deleted.</li>
        </ul>

        <h2>Why we use it</h2>
        <ul>
          <li>To confirm that every page belongs to a real UNILAG student.</li>
          <li>To publish your page, with your consent, and keep it available long-term.</li>
          <li>To take the one-time publication fee and handle refunds.</li>
          <li>To email you about your account, verification, publication and any Faces selection. We don&apos;t send marketing email.</li>
          <li>To keep the platform secure: rate limits, abuse prevention and an audit log of administrative actions.</li>
        </ul>
        <p>We rely on your consent to publish your page and editorial material, and on our contract with you to provide the service you paid for.</p>

        <h2>Who processes it</h2>
        <p>We use Supabase (database, authentication and file storage), Paystack (payments), an email delivery provider and a hosting provider. They process data only to provide those services to us. We don&apos;t sell personal data or share it for advertising.</p>

        <h2>Cookies</h2>
        <p>We use only the cookies needed to keep you signed in. There are no advertising or analytics cookies.</p>

        <h2>Search engines</h2>
        <p>You can stop search engines from listing your page at any time from My Page. Your page stays in the yearbook.</p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Published pages are kept for the life of the archive unless you ask us to remove them.</li>
          <li>Student ID images are deleted once reviewed.</li>
          <li>Payment records are kept as long as accounting and legal obligations require.</li>
          <li>Audit logs are kept to protect the integrity of the archive.</li>
        </ul>

        <h2 id="removal">Your rights</h2>
        <p>Under Nigeria&apos;s data protection law you can ask to access, correct, export or delete your personal data, object to its use, or withdraw consent. You can hide your page yourself from My Page, and request correction, removal or a copy of your data there too, or by emailing <a className="link" href={`mailto:${email}`}>{email}</a>. If you&apos;re unhappy with how we handle your data, you can complain to the Nigeria Data Protection Commission.</p>

        <h2>Contact</h2>
        <p><a className="link" href={`mailto:${email}`}>{email}</a></p>
      </article>
    </SiteShell>
  );
}
