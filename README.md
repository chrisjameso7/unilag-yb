# UNILAG Yearbook

An independent, permanent digital yearbook for the people and generations of the University of Lagos.

*Your years. Your people. Your story.*

Not an official publication of, or endorsed by, the University of Lagos.

## Stack

Next.js 16 (App Router, TypeScript, Tailwind 4) · Supabase (Postgres, Auth, Storage) · Paystack · Resend (email) · Studid (when UNILAG is confirmed in its network). Mobile-first throughout.

## Run it locally

```bash
npm install
cp .env.example .env.local
supabase init            # once: creates supabase/config.toml (keep the existing migrations)
supabase start           # prints the local URL, anon key and service-role key → .env.local
supabase db reset        # applies migrations + seed.sql (fictional demo entries, local only)
npm run dev
```

Sign up at `/signup`. Confirmation emails appear in the local mail viewer that `supabase start` prints. Then give yourself console access:

```bash
npm run admin:grant -- you@example.com admin     # or reviewer / editor / --revoke
```

There are no built-in logins. To try payments without Paystack, set `ALLOW_TEST_PAYMENTS=true` (refused in production).

## Checks

```bash
npm run typecheck && npm test && npm run build
```

CI runs all three on every push (`.github/workflows/ci.yml`).

## Site map

| Area | Routes |
| --- | --- |
| Public | `/`, `/students`, `/student/[username]`, `/classes`, `/classes/[admission\|graduation]/[year]`, `/faces-of-the-year`, `/faces-of-the-year/[year]`, `/about`, `/portrait-guide`, `/privacy`, `/terms` |
| Accounts | `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/auth/confirm` |
| Join flow | `/join` → `/join/verify` → `/join/profile` → `/join/preview` → `/join/payment` → `/join/published` |
| Student | `/dashboard` (My Page), `/faces-of-the-year/submit` |
| Admin | `/admin` (verifications, students, payments, requests, Faces, content, cohorts, audit) |
| API | `/api/webhooks/paystack`, `/api/admin/verification-document/[id]`, `/api/health` |

## Database and security

`supabase/migrations/` holds the schema (plan §10 plus Faces of the Year), views, functions, reference data and storage buckets.

- **Row-level security on every table.** Browsers can read only published pages, consented and published Faces entries, public reference data and their own account rows. They cannot write to any table; all writes go through server code that has authenticated and authorised the caller.
- **Column grants** hide private fields (emails, matric numbers, Studid secrets, document paths, payer emails) even on readable tables.
- **Storage:** `portraits` is public with random keys. `verification-documents` and `editorial-submissions` are private. Reviewers see ID documents through two-minute signed URLs, each view is audited, and the file is deleted once a decision is made. Uploads are checked by size and magic bytes server-side.
- **One publication gate** (`publish_profile_if_ready`): verified + portrait + bio + consent + server-confirmed payment.
- **Append-only audit log**, enforced by a trigger.

Deploy the schema with `supabase link` then `supabase db push`. Never run `seed.sql` in production.

## Supabase Auth settings

- Turn on email confirmations. Site URL = `APP_URL`; allow-list `${APP_URL}/auth/confirm`.
- Templates (*Confirm signup*, *Reset password*, *Change email*) should link to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next={{ .RedirectTo }}`.
- Use custom SMTP before launch; the built-in sender is rate-limited.

## Payments

- Fee lives in `site_content.archive.entry_fee_kobo` (default 299900 = ₦2,999) and is editable by admins.
- Paystack webhook: `https://<domain>/api/webhooks/paystack`. It checks the HMAC signature, stores each event once, re-verifies the transaction with Paystack, then runs the same locked, idempotent fulfilment as the browser redirect. Handles `charge.success`, `charge.failed`, `refund.processed`.
- Refunds are issued from Admin → Payments via Paystack's refund API.

## Admin roles

| Role | Access |
| --- | --- |
| `admin` | Everything, including payments, refunds and the fee |
| `reviewer` | Verifications, students, requests, audit log |
| `editor` | Faces of the Year, content, cohorts |

## Faces of the Year

Editors create an edition and open submissions. Verified students submit (optional, free). Editors shortlist, request a new photo, decline or select. Selecting copies the portrait to the public bucket and creates a draft entry. The student approves the final portrait and words, then editors publish. Changing approved words sends the entry back for approval. Students can withdraw at any time.

## Launch checklist

- [ ] Supabase project on a plan with daily backups; migrations pushed; Auth settings above
- [ ] Domain; `APP_URL`, `OPERATOR_NAME`, `CONTACT_EMAIL` set
- [ ] Resend (or other) sender domain verified; `RESEND_API_KEY`, `EMAIL_FROM`; Supabase custom SMTP
- [ ] Paystack business account activated; live secret key; webhook URL set; one real payment and refund tested
- [ ] Hosting env vars set (`ALLOW_TEST_PAYMENTS` off); `/api/health` added to an uptime monitor
- [ ] Admin, reviewer and editor roles granted
- [ ] Privacy notice and terms reviewed by a lawyer (Nigeria Data Protection Act 2023)
- [ ] Faculty/department list checked against unilag.edu.ng
- [ ] Independent backup copy and one practice restore
- [ ] Pilot with students from several faculties before the full launch
