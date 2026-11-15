# Dedicated backend setup

For the verified temporary developer UUID's **exact future manual password and activation steps**, see [remaining-work-implementation.md](remaining-work-implementation.md#exact-manual-developer-setup-not-executed). No activation helper, email sending or permission change is performed by that documentation. Signed-image renewal and the local rendered preview are also documented there.

**Current status — 10 October 2026:** connected locally to the authorized project `erwliwgbjlutczmtqoss`. Five migrations are applied and real SQL/API/browser verification has run. Public intake/email notifications remain disabled. The temporary developer administrator account remains separate from the client's identity; the client needs a separate account once their email and agreed role are confirmed. See [dedicated-backend-verification.md](dedicated-backend-verification.md) and [developer/client handover](developer-client-handover.md). Admin login, notification recipient and public contact email are separate settings. `.env.local` is ignored and Supabase mode is explicit; `.env.example` remains placeholder-only.

The preparation notes below are historical and describe the earlier unconnected/local-stack stage. Their “unapplied” statements are superseded by the current verification report. Future project/schema writes still require exact target inspection; the authorization in this task applies only to the dedicated reference above.

**Managed hero update (10 October):** `20261010093441_managed_published_features.sql` reuses existing feature/media fields and prepares published-only feature validation plus feature/unpublish synchronization. It is local and unapplied. New transactional checks are in `supabase/tests/managed_features.test.sql`; the local DB test attempt returned connection refused. See `managed-hero-verification.md` for UI behavior, the three-cover hero limit, mock-only cover persistence and proof boundaries. Apply/review all prepared migrations only in the authorized dedicated test environment before relying on these triggers.

**10 October update:** the new category/notification migration is local and unapplied. Source readiness gates now also prevent intake and notification delivery regardless of remote flags. The activation notes below require completion of the PDF/Word policy and all checks in `submission-delivery-preparation.md` first. Bucket restrictions are unchanged, no real email has been sent, and no worker is scheduled.

The migration and SQL tests are prepared locally. `supabase start` failed on 6 October 2026: Docker and Podman are unavailable. The pinned project Deno runtime now type-checks the Edge function; its disabled HTTP gate was exercised separately. No migration has been applied locally or remotely. SQL grammar parsing and frontend tests are **not** database/storage security validation.

## Local verification first

1. Install/start Docker Desktop (or a compatible Podman environment). Node/npm dependencies include the pinned CLI. No system runtime was installed by this task.
2. Run `npx supabase start`. Treat its local credential output as private; do not paste it into chat or reports. `db.seed` is disabled; there is no production sample seed.
3. Run `npx supabase db reset --local`, then `npm run test:security`. SQL tests run in a transaction and roll back their explicitly local test fixtures. Run `npx supabase db lint --local` as well. Do not use `--linked` for local tests.
4. Configure an ignored `.env.local` with `VITE_DATA_MODE=supabase`, the local URL and **publishable/anon** key. Never use a service/secret key in a Vite variable. Restart Vite.
5. Create two local Auth users (staff and ordinary) using local Studio. Provision one staff user with trusted SQL below. Do not copy public team names into permissions.
6. Set process-only local test variables for `npm run test:backend:http`: `LOCAL_SUPABASE_URL`, `LOCAL_PUBLISHABLE_KEY`, `LOCAL_SERVICE_KEY` (local only, never Vite), `LOCAL_STAFF_EMAIL/PASSWORD`, `LOCAL_ORDINARY_EMAIL/PASSWORD`, and `LOCAL_TEST_PROJECT_CONFIRMED=dilraj-editorial`. The runner refuses remote origins and requires the dedicated schema marker, creates/cleans only its own UUID fixtures, and directly tests Auth/CRUD/Storage, publishing privacy, metadata self-escalation and concurrent conversion. It is prepared but has **not run** because the local stack is unavailable. Do not paste credentials into chat; private process entry is required.

7. Verify real login/logout, recovery through local Mailpit, ordinary-user denial, every CRUD/publish/unpublish workflow, optimistic conflict handling, category/author references, settings/order, file uploads and public reflection in separate anonymous/staff browser contexts.
8. Test Storage API directly: ordinary/anonymous upload rejection, guessed draft paths and submission paths denied, permitted staff uploads, MIME and maximum-size enforcement, public covers/PDFs readable only while referenced by published content. Signed URLs expire in five minutes; previously issued URLs remain usable until expiry after unpublishing. If immediate revocation is required, choose a proxy-download strategy before launch.
9. Test concurrent conversion requests, repeated conversion after deletion, revoked staff JWTs and private submission/attachment access. The SQL suite covers role/policy behavior; Storage HTTP, Auth and concurrent requests still need full-stack tests.

## Secure first-admin provisioning

Create/invite the intended user through **trusted Auth administration**. Confirm the actual Auth UUID and address out of band. Disable public signup if contributors do not need accounts; the site contains no signup UI. In a trusted dedicated-project SQL session, use a parameterized UUID rather than an invented identity:

```sql
insert into private.staff_accounts(user_id, role, active)
values ('REPLACE_WITH_CONFIRMED_AUTH_USER_UUID'::uuid, 'admin', true);
```

No browser role-management endpoint exists. `editor` and `admin` currently share editorial CRUD/review/settings rights; neither can provision staff through the browser. The role distinction reserves a future permission decision, without a custom role builder. Revoke access by setting `active=false` in trusted SQL; RLS reads current database authorization, not user metadata or stale role claims. Accounts, public authors and public team profiles are separate entities. Frontend navigation is convenience, not security.

## Dedicated remote project — only after separate authorization

1. Confirm the project reference/ownership, region, backup plan and selected hosting/domain. No existing project is assumed. Create the dedicated project yourself or authorize its creation separately.
2. Review existing remote schema before proposing changes. Obtain explicit approval for the migration. Then `npx supabase login`, `npx supabase link --project-ref REPLACE_WITH_DEDICATED_REF`, inspect migration state and use a reviewed `npx supabase db push --dry-run`. Apply only after authorization; never import test fixtures.
3. Configure Auth Site URL and exact recovery redirect (`https://APPROVED_DOMAIN/admin/recovery`), email delivery, password policy/rate limits and signup policy. Provision staff via trusted administration; test recovery on the real domain.
4. Set browser-safe dedicated URL/publishable key in host environment. Backend mode never loads demo content on failure. Test empty/incomplete homepage setup and all failure paths; analytics remain disconnected.
5. Review buckets/policies after apply. Uploaded images: PNG/JPEG/WebP, 3 MB; case documents: PDF, 10 MB; private submission PDFs: 5 MB. All buckets are physically private. RLS permits anonymous reads only for assets attached to published public records. Staff uploads have unique account/UUID paths and no upsert permission. Client signature checks supplement bucket MIME/size limits; declared MIME is not malware scanning. Decide whether server image normalization/document scanning is needed before public intake.
6. Configure server-only submission secrets through the approved secret manager, never Vite: CAPTCHA secret, random rate-limit HMAC pepper, exact-origin allowlist, trusted gateway IP provenance. Keep `INTAKE_ENABLED=false` and both private DB gate flags false.
7. Serve/test the function locally, then authorize its deployment separately. The endpoint intentionally has platform JWT validation disabled because contributors are anonymous; its own gates, CAPTCHA hostname/action verification, actual streamed size limit, durable network/email limits, honeypot and payload/file validation are mandatory. The browser cannot call service-only intake/limiter RPCs or write attachments directly.
8. Test accepted/rejected CAPTCHA, spoofed IP headers, rate limiting, oversized/mislabeled uploads, duplicate request IDs, storage/DB failures, private attachment reads and successful acceptance. Validate the gateway header before enabling. After controls pass, trusted SQL may set `private.intake_settings.enabled=true, controls_verified=true`; set server `INTAKE_ENABLED=true` and frontend **public** Turnstile site key. Neither a frontend flag nor CAPTCHA alone enables delivery. The UI reports success only after confirmed server/database acceptance.
9. Import approved drafts via the reviewed content process; verify prelaunch, hosting metadata/revalidation and real access boundaries. Deployment/domain purchase remain separate authorized actions.

## Provisional decisions and limits

Case `metadata` is bounded JSON for client-specific fields; fixed public projections retain current reference, kind, setting, tags, date and source-note fields. This data never controls authorization. Case PDFs are individually marked public/staff-only. Approved submission conversion keeps private contact email outside public article data, creates a draft with no author/cover selection and must be reviewed before publishing.

Settings/catalog and collection ordering use transaction RPCs; article/case/team edits use `updated_at` conflict checks. Category/author deletion respects references. Dashboard counts read actual staff-visible records; activity logs contain operation names, not contributor contact details. Uploads not yet attached remain private; orphan cleanup/retention and private contributor-data retention require operational decisions. The project has no real analytics collector, email integration or hosted verification yet.
