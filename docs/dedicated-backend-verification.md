# Dedicated Supabase verification — 10 October 2026

The regular local application is connected in Supabase mode to **erwliwgbjlutczmtqoss** (`https://erwliwgbjlutczmtqoss.supabase.co`). No frontend deployment was performed. Only this project was modified.

## Remote inspection and changes

Authenticated CLI access was available. The linked reference was checked exactly. Initial inspection found PostgreSQL 17.11, no application tables or migration history, no Auth users, and no Storage buckets/objects. Supabase platform infrastructure (including its RLS event-trigger function) was retained. There was no conflicting client schema or content to reconcile.

Applied in order, after SQL parsing/review and CLI dry runs:

1. `20261006151855_editorial_backend.sql` — editorial schema, staff authorization, RLS, private Storage buckets, guarded RPCs and disabled intake.
2. `20261010084746_confirmed_categories_and_submission_notifications.sql` — four confirmed categories, initially unpublished; private disabled notification queue. No sample articles, cases or team profiles were imported.
3. `20261010093441_managed_published_features.sql` — distinct published-only feature selection; article flags and shared ordering stay synchronized on feature/unpublish/delete.
4. `20261010101924_explicit_rpc_privileges.sql` — remove inherited anonymous staff-RPC grants and external execution of the existing platform trigger function; prevent automatic execute grants on future application functions. The platform trigger remains intact. Staff RPCs retain database authorization checks.
5. `20261010102300_safe_homepage_updates.sql` — predicate-based feature synchronization compatible with hosted `safeupdate`. The first live settings save exposed this issue; mocked transport and direct SQL alone did not detect it. Historical migrations were not rewritten.

Auth now has public signup and anonymous sign-ins disabled, email/password login enabled for provisioned users, a 12-character minimum password, local Site URL `http://127.0.0.1:5173`, and exact recovery redirects for both `127.0.0.1:5173/admin/recovery` and `localhost:5173/admin/recovery`. A real public signup attempt returned `signup_disabled` without creating an account. Hosted confirmation/MFA settings and undeclared platform settings were preserved through a minimal Auth-only config push. The CLI email flag controls the hosted email provider; it remains enabled while global signup is disabled.

All three buckets are physically private: editorial images (PNG/JPEG/WebP, 3 MiB), case documents (PDF, 10 MiB), submission attachments (PDF, 5 MiB). Published content grants reader access through RLS/signed URLs; no public-bucket bypass was enabled.

The URL/publishable key are in ignored `.env.local` using the existing names. `.env.example` stays placeholder-only. Administrative keys and randomly generated test passwords stayed in process memory. They were not written to source, artifacts or frontend bundles.

## Actual verification

**86 database assertions passed** on the dedicated project, with transactional fixtures rolled back: security 42, notifications 15, managed features 14, explicit privileges 15. The runner captures every TAP assertion, not just the final plan. The CLI pgTAP command could not run because Docker/Podman is absent; the alternative executes the reviewed SQL directly against this project. Two pre-existing feature-test defects were corrected: its published fixture lacked a required cover, and a data-modifying CTE was nested illegally.

**152 live API/browser checks passed** using disposable, clearly labelled verification accounts and records, with real Supabase Auth/PostgREST/Storage and no HTTP interception. The fixture journal records UUIDs and paths under `.qa/dedicated-backend/http`. Coverage includes:

- Anonymous and ordinary authenticated users read published records only. Draft articles/cases/team, submissions and attachment metadata remain hidden.
- Anonymous/ordinary uploads, content insertion, direct management, review and staff self-assignment are denied. User metadata claiming `admin` has no effect. Ordinary settings/ordering RPC calls fail.
- Staff can create/edit/publish/unpublish articles; shared features persist and prune on unpublish. Actual admin controls save feature ordering and homepage copy; article edits and uploaded covers survive reload.
- Cases and team records persist and render through their public routes, with draft privacy.
- Real cover/PDF uploads, MIME and image-size restrictions, public versus staff-only PDFs, private attachments, signed downloads and public-bucket bypass denial.
- Concurrent submission conversion returns one draft; deletion preserves its conversion tombstone. No public intake or email delivery is enabled by these tests.
- Staff login works in the existing UI. Ordinary login reaches the staff-denied screen. Revoking staff access takes effect with its existing JWT.
- A separate anonymous browser sees saved featured ordering and content at 390, 768 and 1440 pixels without horizontal overflow. Selected articles open their correct routes and survive reload. Full motion loads backend cover URLs, and the existing rotating carousel selects real records. Pointer/touch motion behavior is covered by the separate public regression suite.
- Real Auth verification endpoints redirect to both approved local recovery destinations. Generated test links and session tokens were not recorded or sent by email. This proves redirect configuration, not SMTP delivery or the application's full PKCE email recovery round trip.

All verification articles, cases, profiles, authors, test category, settings, upload metadata/files, submissions/attachments and disposable Auth users are removed after each run. Cleanup targets recorded UUIDs and paths only. Operational audit events are retained. Four unpublished confirmed categories remain, together with the intended inactive administrator account. No approved publication content exists yet.

The regular app never substitutes fictional rows on backend failure. Live-only labels, loading messages and empty states now describe publication content. The existing design, single 3D cover scene, carousel, motion preferences, provider boundaries, routes and admin editors are preserved. Demo browser regressions explicitly select mock mode so `.env.local` cannot send their mutations to the real project.

Additional validation: lint, TypeScript, production build, 64 unit tests, 78 public/admin browser scenarios, 7 intercepted-backend UI scenarios, Edge type checks and the network-denied disabled-delivery policy test pass. Intercepted UI tests remain UI evidence, separate from real database/API verification. Remote database lint reports no schema errors. The existing WebGL chunk-size warning remains.

The final read-only inventory, after the last HTTP run, confirms zero verification content/files, one inactive intended Auth account, no active staff, and all delivery gates disabled. A scan of all 20 production output files found zero matches for this project's administrative API keys. Fresh anonymous homepage screenshots at 390/768/1440 pixels show the actual empty publication state with no verification records, browser exceptions or horizontal overflow. With no approved homepage settings, the existing setup-status banner remains visible; it does not indicate fictional content fallback.

## Temporary developer administrator and client content

**Identity correction, 10 October:** The provisioned temporary developer administrator account belongs to the developer, not the client. Its email, UUID and remote activation status were not changed by automated scripts. No password was supplied or retained by this task. Auth has a server-managed password hash for the pending account; its presence is not evidence of completed owner password setup. No invitation or recovery email was sent. Account details are kept only in ignored local `.qa/` records. The client's own email/account is pending; do not rename, transfer or reassign this developer account.

Admin login identity, submission-notification recipient and public contact email are independent. The developer address is neither an approved notification recipient nor a public contact. The notification worker reads only its separately configured `NOTIFICATION_RECIPIENT`; public contact reads approved homepage settings. Neither derives an email from Auth. Keep those settings unconfigured and delivery disabled until separately confirmed. See [handover and current audit](developer-client-handover.md) for client onboarding and access removal.

1. In this project's Auth Dashboard, verify email delivery for the intended recipient. Do not assume default mail can deliver to arbitrary recipients. Keep public signup disabled. Never paste a password, invite link or token into chat.
2. Start the local site on `http://127.0.0.1:5173`. Initiate **Forgot password** from `/admin/login` for the intended account. Open its email in the same browser and origin; the existing flow uses PKCE. An administrator-generated implicit recovery URL is not a substitute for that flow.
3. The account owner confirms email ownership and chooses a password of at least 12 characters. Verify that exact Auth UUID/address and successful authentication out of band.
4. Only then, use trusted SQL in **this dedicated project's** Dashboard to activate the already existing private staff row for that exact UUID. Check its role is `admin`; change only its `active` field to true. Do not grant permissions through public team profiles, user metadata, browser tools or public signup. The activation has not been executed. An executable activation helper was blocked by automatic approval review; these are manual administrative steps.
5. Sign in again. Publish the approved categories, add approved author attribution, upload approved covers, save reviewed articles, and choose/order published features in **Homepage & content**. Save approved homepage copy/contact details; add approved case records/documents and team identities through their existing editors. Do not import the browser demo store or verification fixtures.

## Remaining limitations and blockers

- The temporary developer administrator's email confirmation, password setup, activation and first login remain pending; its activation status is unchanged. The client's separate email, account and agreed staff role are pending. Auth email delivery and the complete PKCE recovery email round trip are unverified. Redirect configuration and temporary-user login are verified separately.
- Supabase's security advisor still reports the intentionally public intake-status boolean and authenticated staff RPCs as SECURITY DEFINER warnings. Their narrow grants/internal staff checks are covered by real tests. Leaked-password protection is disabled; it requires an eligible plan, and no upgrade or purchase was made. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security).
- Signed URLs already issued may remain valid for their lifetime (the app uses five minutes) after unpublication. Direct downloads/new signed URLs are permission-checked. Immediate revocation, malware scanning, retention and production operating procedures remain launch decisions.
- Production frontend hosting/domain/redirects are pending. No deploy or Edge-function deployment occurred.
- Public submission delivery, notification delivery and worker scheduling remain disabled. Guidelines, recipients, email provider configuration and abuse-control testing are still required. Analytics remain disconnected.
- Browser checks use desktop Chromium with emulated viewports/touch regression tests, not physical phones/tablets. No production traffic/load or complete concurrency-readiness claim is made.

## Reproduce safely

The dedicated commissioning runners are guarded by the exact project reference and refuse existing publication content. Run them **sequentially**, only while the project is empty; never delete client content to make a test pass. The SQL suites use collection totals and singleton settings, so running them alongside the HTTP fixture suite produces invalid test assumptions. A concurrent attempt demonstrated this and was rolled back; a later sequential run passed all assertions.

```powershell
npx supabase login
npx supabase link --project-ref erwliwgbjlutczmtqoss
if ((Get-Content supabase/.temp/project-ref -Raw).Trim() -ne 'erwliwgbjlutczmtqoss') { throw 'Wrong project' }
npx supabase migration list --linked --project-ref erwliwgbjlutczmtqoss
npx supabase db push --linked --project-ref erwliwgbjlutczmtqoss --skip-vault --dry-run
# Inspect remote schema/Auth/Storage and the dry run before any future apply.
# Existing five migrations are already applied; this is not a reset or seed.
npx supabase db push --linked --project-ref erwliwgbjlutczmtqoss --skip-vault

$env:VERIFY_DEDICATED_PROJECT='erwliwgbjlutczmtqoss'
npm run verify:dedicated:sql
# In a separate terminal, start the regular connected app on port 5173.
npm run verify:dedicated:http
Remove-Item Env:VERIFY_DEDICATED_PROJECT
```

The HTTP runner uses the authenticated CLI to obtain a server-only key privately in memory. Do not run API-key commands with their output displayed, place administrative credentials in Vite variables, or copy them into reports. Do not use `db reset`, seed import, `--include-seed`, full-root config pushes or another project reference.

Evidence lives in ignored `.qa/dedicated-backend`: SQL TAP JSON, fixture journals, responsive screenshots, anonymous interaction video, Auth config comparison and security-advisor output. Screenshots containing verification titles are test evidence, not client publication content.

- Final empty homepage: `homepage-empty-390.png`, `homepage-empty-768.png`, `homepage-empty-1440.png`.
- Live temporary-content evidence: `http/public-test-content-{390,768,1440}.png` and `http/public-test-content-full-motion.png`.
- Anonymous interaction recording: `http/live-backend-public-interaction.webm` (the labelled records shown have since been removed).
- Final cleanup and bundle checks: `final-inventory.json` and `bundle-security.json`.
