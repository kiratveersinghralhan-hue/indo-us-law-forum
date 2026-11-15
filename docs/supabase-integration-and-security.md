# Supabase Integration and Security Report

## 1. Executive Summary

Indo-US Law Forum uses **Supabase** as its primary backend platform across PostgreSQL, Auth, Row-Level Security (RLS), Private Storage, and Edge Functions.

- **Dedicated Project Reference:** `erwliwgbjlutczmtqoss` (`https://erwliwgbjlutczmtqoss.supabase.co`)
- **Database Engine:** PostgreSQL 17.11
- **Applied Migrations:** 5 sequential, reviewed SQL migrations (`supabase/migrations/`)
- **Verification Evidence:** 86 database TAP assertions (`supabase/tests/*.test.sql`), 152 live API/browser checks, 101 Vitest unit/integration tests, and mocked Playwright browser suites (`tests/browser/backend.ts`)
- **Safety Posture:** No migrations were re-run, reset, or altered during release-candidate packaging. Public submission intake and email notifications remain hard-disabled by source and database gates until client policy sign-off.

---

## 2. Backend Architecture & Applied Migrations

All database schema definitions, RLS policies, private helper tables, RPCs, and storage bucket configurations are version-controlled under `supabase/migrations/`:

1. **`20261006151855_editorial_backend.sql`**
   - Establishes `private` and `public` schemas.
   - Creates `private.staff_accounts` (`user_id`, `role` in `('editor', 'admin')`, `active` boolean) and `private.editorial_audit_log`.
   - Creates public content tables: `categories`, `authors`, `editorial_assets`, `articles`, `cases`, `case_documents`, `team_members`, `homepage_settings` (singleton `id = true`), plus `submissions` and `submission_attachments`.
   - Defines `public.staff_role()` and `private.is_active_staff()` security-definer helpers checking active database rows rather than mutable JWT `user_metadata`.
   - Configures three physically private Storage buckets (`editorial-images`, `case-documents`, `submission-attachments`) with strict MIME and byte limits.
2. **`20261010084746_confirmed_categories_and_submission_notifications.sql`**
   - Seeds the four confirmed research categories (`Cross Border Insolvency and Restructuring`, `M&A and Foreign Investment Regulation`, `Cross Border Dispute Resolution and Enforcement`, `Regulatory Exposure and Enforcement`) as initially unpublished records (`published = false`) so no empty categories appear publicly before articles are published.
   - Adds `private.submission_notification_queue` and `private.notification_settings` (disabled by default).
3. **`20261010093441_managed_published_features.sql`**
   - Enforces that only `published` articles and cases can be featured in `homepage_settings`, and automatically prunes unpublished or deleted items from featured arrays via database triggers.
4. **`20261010101924_explicit_rpc_privileges.sql`**
   - Revokes default `PUBLIC`/`anon` execution privileges on staff RPCs (`save_homepage_settings`, `reorder_collection`, `convert_submission_to_draft`, `delete_submission`) and restricts default function privileges on future objects.
5. **`20261010102300_safe_homepage_updates.sql`**
   - Updates feature-synchronization UPDATE statements with explicit `WHERE` predicates for compatibility with Supabase's hosted `safeupdate` extension.

---

## 3. Authentication, Authorization & Row-Level Security (RLS)

### Staff Authentication (`src/backend/auth-ui.tsx`, `src/backend/supabase-provider.ts`)
- Public user registration (`enable_signup`) and anonymous sign-ins are **disabled** in Supabase Auth.
- Staff sign in at `/admin/login` with email and password (12-character minimum policy) or initiate PKCE password recovery at `/admin/recovery`.
- After authentication, the frontend queries `rpc('staff_role')`. If the authenticated user has no row in `private.staff_accounts` with `active = true`, the UI immediately presents the **Staff access unavailable** boundary and blocks editorial tools.

### Row-Level Security (RLS) Enforcement
RLS is enabled and forced on all application tables:
- **Anonymous (`anon`) & non-staff (`authenticated` without active staff status):**
  - `SELECT` is permitted **only** on published public records (`status = 'published'` for `articles` and `cases`; `published = true` for `categories`, `authors`, `team_members`; `homepage_settings` where `id = true`; `case_documents` where `public_access = true` and parent case is published; `editorial_assets` only when referenced as `cover_asset_id` by a published article or `photo_asset_id` by a published team member).
  - Zero access (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) to drafts, unpublished records, `submissions`, `submission_attachments`, `private.staff_accounts`, `private.editorial_audit_log`, or `private.submission_notification_queue`.
- **Active Staff (`editor` / `admin` in `private.staff_accounts` with `active = true`):**
  - Full editorial CRUD on `categories`, `authors`, `articles`, `cases`, `case_documents`, `team_members`, `editorial_assets`, and `homepage_settings`.
  - Read/review/convert/delete access to `submissions` and read access to `submission_attachments`.
  - Staff accounts **cannot** self-provision or escalate roles from the browser; `private.staff_accounts` can only be modified by trusted database administration (`postgres` / `service_role`).

---

## 4. Private Storage & Signed Asset Lifecycle

All three Supabase Storage buckets have `public = false`:

| Bucket ID | Allowed MIME Types | Max Size | Access Policy |
| :--- | :--- | :--- | :--- |
| `editorial-images` | `image/png`, `image/jpeg`, `image/webp` | 3 MiB (`3,145,728` B) | Active staff upload (`staff/<uid>/<uuid>.<ext>`); anonymous read only when referenced by a published article or team profile |
| `case-documents` | `application/pdf` | 10 MiB (`10,485,760` B) | Active staff upload; anonymous read only when `case_documents.public_access = true` on a published case |
| `submission-attachments` | `application/pdf` | 5 MiB (`5,242,880` B) | Service-role intake only; active staff read only; never public |

### In-Memory Signed URL Renewal (`src/backend/signed-assets.ts`)
- Signed URLs are issued for 300 seconds (5 minutes) and cached strictly in memory (never written to `localStorage` or persisted back into article JSON).
- Observed images renew proactively 60 seconds before expiry while the tab is visible, pause timers while the tab is hidden, and clear private URL caches immediately on Auth user changes or sign-out.
- Server-rendered Open Graph tags use the stable `/media/:assetId` SSR route (`src/ssr/render.tsx`), which re-verifies anonymous asset visibility on each request rather than embedding expiring storage tokens into HTML metadata.

---

## 5. Edge Functions & Disabled Intake / Notification Gates

Two Supabase Edge Functions are prepared under `supabase/functions/`:
1. **`supabase/functions/public-submission/index.ts`**: Hardened anonymous submission intake handler with origin verification, Cloudflare Turnstile verification, HMAC-hashed IP/email rate limiting, PDF magic-byte inspection, and transactional RPC persistence.
2. **`supabase/functions/submission-notifications/index.ts`**: Private notification queue worker using Resend with idempotency keys (`submission/<id>`) that sends only the submission reference UUID and `/admin/submissions` link (never exposing contributor PII or attachments in email bodies).

**Defense-in-Depth Safety Gates:**
In `supabase/functions/_shared/submission-policy.ts`, both `submissionPolicyReady` and `notificationPolicyReady` are hardcoded to `false`. Even if environment variables or database flags were toggled accidentally, neither Edge Function will accept public uploads or send emails until the client approves the submission/privacy policy and explicitly authorizes enabling these gates.

---

## 6. Credential Hygiene & Frontend Boundary Guards

- **Publishable Key Only in Browser:** Only `VITE_DATA_MODE`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY` (plus optional `VITE_TURNSTILE_SITE_KEY`) are read by the frontend.
- **Automated Secret Rejection:** `src/backend/env.ts` and `scripts/review-config.mjs` inspect environment variables at startup/build time and throw an immediate error if:
  - `VITE_SUPABASE_PUBLISHABLE_KEY` starts with `sb_secret_` or contains `service_role`, or
  - Any `VITE_*` variable name matches `/SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|PEPPER|TOKEN/i`.
- **Sanitized Error Reporting:** `src/backend/editorial-Step-errors.ts` and `src/admin/article-editor-model.ts` map backend/storage HTTP errors to safe user-facing guidance and log only `{ stage, status, code }` from an allowlist, preventing raw server messages, JWTs, or SQL details from leaking into the DOM or console.

---

## 7. Local Functionality vs. Live Supabase Configuration Matrix

| Feature / Workflow | Local Mock Mode (`VITE_DATA_MODE=mock`) | Local Connected / SSR Mode (`VITE_DATA_MODE=supabase`) | Live Supabase Requirements / Status |
| :--- | :--- | :--- | :--- |
| **Public Pages, 3D Sculpture, 360° Carousel, Motion Modes** | Works offline with labeled demo records | Works against live published records (shows honest empty states when database has 0 published articles) | Ready; requires client-approved articles/covers to populate public collections |
| **Category Filtering & Search** | Works offline across 4 confirmed categories | Works against published categories & articles | 4 confirmed categories exist in DB (`published=false` until content is ready) |
| **Admin Dashboard & Rich Article/Case/Team/Author Editors** | Works offline via browser `localStorage` | Works with real Supabase Auth, RLS, optimistic locking & private Storage | Verified against `erwliwgbjlutczmtqoss`; requires active staff login |
| **Staff Sign-In & Session Persistence** | Simulated role switcher (`editor` / `admin`) | Real Supabase Auth email/password + `public.staff_role()` check | Verified; client's own staff email/account provisioning is pending client email |
| **Password Recovery Email Round-Trip** | UI preview only | Real `resetPasswordForEmail` + PKCE `/admin/recovery` | Requires approved production domain in Supabase Auth redirect allowlist & SMTP verification |
| **Private Cover & PDF Uploads + Signed URL Renewal** | Simulated upload preview in memory | Real Storage upload to private buckets + 5-min signed URL renewal | Verified in dedicated project (`editorial-images`, `case-documents`) |
| **Public Contributor Submissions & Email Notifications** | Simulated local submission & draft conversion | Displays intentional "Submissions are not open yet" notice | Hard-disabled (`submissionPolicyReady = false`) pending client file/privacy policy & Resend setup |
| **Node SSR HTML, Sitemap, `/media/:id` & CSP Headers** | Works locally with fixture/mock provider | Queries live public published records on each request with `no-store` | Ready (`npm run build:rendered && npm run preview:rendered`) |
