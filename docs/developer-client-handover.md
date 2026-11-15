# Developer and client handover — 10 October 2026

**11 October follow-up:** signed-image renewal and portable local HTML/sitemap/404 rendering are implemented. See [rendering and conditional manual setup](remaining-work-implementation.md) and [article-editor/auth UI verification](admin-editor-auth-fixes.md). The developer signed in themselves for the 10 October real editor checks; their existing account was observed confirmed/active. Earlier inactive/unconfirmed and rendering findings below are dated audit snapshots. Hosting and client content/onboarding remain pending. Do not repeat activation or change the developer's account based on the old snapshot.

The dedicated backend is `erwliwgbjlutczmtqoss`. The website remains a local connected preview. No deployment or real email was sent during this follow-up audit; no remote account, permissions, records, migrations or configuration were changed.

## Separate email purposes

| Purpose | Current state | Configuration / owner |
| --- | --- | --- |
| Temporary developer administrator login | Provisioned developer account (email/UUID kept out of public docs); confirmed/active `admin` observed during 10 October owner sign-in | Existing Auth account and private staff row; keep email/UUID and owner-managed activation unchanged |
| Client's own staff login | Email and agreed role pending | A new, separate Auth account and private staff row after approval |
| Submission-notification recipient | Unconfirmed, delivery disabled | Server-only `NOTIFICATION_RECIPIENT`, with separately verified sender/provider |
| Public contact email | Unconfirmed, no email configured | Approved homepage `contact.email`; not an Auth identity |

There is no automatic copying between these purposes. Source inspection confirms the notification worker reads its explicit recipient environment variable, and public contact reads homepage settings; neither reads a user's Auth email. Do not default either to the developer's address. Auth password-recovery/invitation mail is separate from submission notifications and must be verified independently, without enabling public signup or submissions.

## Client handover sequence (prepared; not executed)

1. Obtain the client's own email, confirm ownership out of band, and agree `editor` or `admin` access and publishing authority. Both existing roles currently share editorial CRUD/review/settings rights; the UI does not grant/revoke staff accounts. Public team profiles confer no permissions.
2. In trusted Auth administration for this exact project, create or invite a **new client account**. An invitation sends real email: perform this only after recipient/delivery configuration and explicit sending authorization. Do not change the developer account's email, UUID, password or ownership. Keep public signup disabled.
3. The client completes email confirmation and chooses a password of at least 12 characters. Verify local recovery in the same browser/origin using the existing PKCE flow. For production, first approve the domain and exact redirects. Never send passwords or recovery/invite tokens through chat.
4. Verify the client's exact Auth UUID/address, then grant the agreed role through trusted administration in `private.staff_accounts`, using that UUID. No arbitrary existing user receives access. Record the grant and authorization without passwords/tokens.
5. Verify client sign-in, dashboard access and logout. With approved content or labelled disposable fixtures, verify draft creation, cover upload, edit/reload, publish, feature ordering and separate anonymous visibility; then unpublish and check privacy. Only remove fixtures created for this check.
6. Obtain client acceptance and an explicit decision on temporary developer access. If removal is requested, deactivate **only the developer's exact private staff row**, verify that its existing JWT can no longer manage/read private content, and revoke developer sessions through trusted Auth administration as appropriate. Retain the developer Auth identity and audit trail; do not delete/reassign it implicitly. Check retained Storage ownership before any separately authorized account deletion.
7. Record client UUID/role, successful workflow verification, approved public contact and notification recipient **separately**, plus whether developer access remains. Do not remove the last working administrator before client verification.

The existing [backend setup steps](dedicated-backend-verification.md#temporary-developer-administrator-and-client-content) are conditional provisioning guidance; do not rerun them for the already active developer identity. This task did not send recovery mail, change passwords or activate permissions. Client onboarding/access removal await client information and authorization; they are not completed operations. Supabase documents the limits of token/session revocation in [User Management](https://supabase.com/docs/guides/auth/managing-user-data); this application's database staff checks were separately tested with an existing revoked staff JWT.

## Workflow and presentation audit

- Provider code uses revision checks on edits, reports missing/denied saves, strips temporary cover URLs before persistence, and refreshes after saves, deletes, reorder and homepage changes. Features use the existing reviewed database synchronization and published-only rules.
- Prior live evidence remains **86 SQL assertions and 152 real API/browser checks**, including real cover persistence, staff edits, ordered features and separate anonymous reloads. Fixture journals are cleaned. This follow-up does not replay remote fixture writes or count intercepted UI tests as database proof.
- Public refresh occurs on same-environment writes, page reload and window focus. There is no Supabase Realtime subscription or periodic polling. A continuously focused reader can keep old content until focus/reload; signed cover URLs last five minutes. Long-session expiry renewal is not independently verified and remains a launch follow-up.
- **36 targeted public/admin browser scenarios passed again**, covering article/case/team CRUD, validation/duplicate slugs, explicit publication, feature pruning and cover correspondence in Full/Reduced modes, destructive-dialog focus/Escape, unsaved-change blocking, mobile navigation and touch-safe scrolling. Widths span 320–1440 pixels. The WebGL-unavailable scenario intentionally emits renderer errors and confirms the selectable fallback works.
- **7 existing backend transport UI scenarios plus 1 new focus/reload scenario passed**. These cover ordinary-user denial, mobile editors, read errors, empty publications, disabled intake and an already-open homepage receiving changed settings on focus/reload without inheriting an Auth email. HTTP is intercepted; these are UI checks, not new live database evidence.
- Lint, TypeScript, build, **64 unit tests** and the network-denied disabled-delivery policy test pass. A fresh read-only remote inventory confirms zero article/case/team/settings/assets/submissions/files, four unpublished categories and only the intended inactive developer account. An exact-UUID read confirms its original email, unconfirmed status, `admin` role and `active=false`. Production bundle scanning found zero administrative-key matches across all 20 output files.
- Current public mode shows empty collections and a neutral cover; the existing settings/setup banner remains until approved homepage settings are saved. No fictional rows are substituted on failure. Search suggestions in generic empty panels remain generic and may be refined during final content review.

Mobile evidence uses Chromium emulation, not physical-device certification or complete accessibility conformance. Fresh connected screenshots at 390/768/1440 have no horizontal overflow or browser exceptions. Evidence is in ignored `.qa/dedicated-backend`; previous live interaction recording remains valid and its test records are removed.

## Build, hosting and SEO audit

The lazy-loaded WebGL chunk remains 540.77 kB (135.95 kB gzip), emitting the existing size warning. No motion redesign or dependency upgrade was introduced. Public route, admin, rich-editor and WebGL bundles remain separate.

SQL grammar validation also passes for all five migrations and four SQL test files; it does not reexecute database checks. Content prelaunch validation is **pending**, not passed: `npm run check:prelaunch` without a file exits with its usage requirement, and no approved client snapshot exists. Once supplied, run `npm run check:prelaunch -- PATH_TO_APPROVED_SNAPSHOT.json` (read-only validation, not an import).

Generated HTML is an app shell with `noindex, nofollow`; client metadata updates do not provide server-rendered article HTML. Local preview returns HTTP 200 for missing article/case URLs while the app renders a not-found state. This is local SPA behavior, **not a production HTTP 404 implementation**. There is no approved canonical domain, sitemap, stable social image or rendering/revalidation adapter. Do not remove `noindex` merely because a bundle builds.

The read-only raw-HTML probe covers `/`, `/articles`, missing article/case slugs and `/admin/login`; each returned the noindex app shell. Results are saved to `.qa/dedicated-backend/hosting-readiness.json`. Local preview response behavior does not certify a selected production host.

Before production, choose hosting and SSR/publish-triggered prerendering with the client, then implement crawler-visible published-only HTML/metadata, actual 404s, sitemap and publish/unpublish/delete/slug/order cache invalidation. Test deep-link refreshes, stable share-image access, private/no-store admin/auth responses and security headers on the selected host. Hosting/configuration/deployment remain pending; see [hosting/SEO strategy](hosting-seo-strategy.md).

## Information still needed

Client login email and role/publishing authority; whether temporary developer access should be removed after acceptance; distinct notification recipient and public contact; verified mail sender/provider; submission guidelines/rights/retention/file policy; approved branding, authors/articles/citations/covers, team and case content; domain/hosting/rendering choice, stable share artwork, privacy and launch approval. Keep submissions, notifications and analytics disabled until their separate gates are met. See [completion checklist](completion-checklist.md).
