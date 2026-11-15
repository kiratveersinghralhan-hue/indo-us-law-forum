# Signed images, rendered HTML and manual administrator setup — 10 October 2026

**Later status, 11 October:** the developer completed their own sign-in before the real editor verification; the exact account was observed confirmed/active on 10 October. The manual setup instructions below describe the earlier inactive snapshot and are conditional, not a request to repeat activation. See [latest editor/auth verification](admin-editor-auth-fixes.md). No recovery email, password update or permission change was performed in that follow-up.

This increment preserves the public presentation, content, 3D, providers and admin workflows. It writes no remote records/schema/configuration, sends no email and deploys nothing. The only backend target remains `erwliwgbjlutczmtqoss`. Intake, notification delivery and analytics stay disabled. Prior 86 database assertions/152 real workflow checks remain separate evidence; no broad CRUD audit is replayed.

## Signed-image renewal

`src/backend/signed-assets.ts` is an in-memory manager per application/Auth environment. The existing provider still signs through the current user's Supabase client, retaining Storage/RLS authorization. Simultaneous requests for the same asset share a promise. Cached URLs are reused until 60 seconds before their five-minute expiry; a single timer renews only assets observed by mounted views. Hidden tabs pause scheduled work. Visibility/focus resumes due assets.

The shared image component updates public article/profile/carousel images and private admin previews independently of record/editor state. The hero observes the same manager so static covers and WebGL textures receive renewed URLs. An image failure requests one shared renewal; a 30-second cooldown prevents repeated failed-image events from looping. Signing denial clears the image and stops automatic retries; later focus/visibility may retry after cooldown. Disposal removes timers/listeners; Auth identity changes clear cached private URLs. Unmounted images do not keep renewing.

Only asset IDs are persistent references. The existing write adapter still removes `coverUrl`/`coverAlt` from content before saving; renewal never saves a record. URLs are not put in localStorage. PDF download renewal remains the existing explicit page reload flow; this task addresses images. Already-issued signed URLs retain their documented validity until expiry, including after unpublication.

Official API behavior: [Supabase createSignedUrl](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl) accepts an expiry in seconds and requires permission to read the object. Renewal does not bypass access policy.

## Local HTTP rendering

Run:

```powershell
npm run build:rendered
npm run preview:rendered
# http://127.0.0.1:5190
```

The new Node HTTP entry point uses the built browser application and SSR bundle. It reuses the same public React routes, layouts, structured body renderer and providers. Public query results are request-scoped; an escaped JSON bootstrap supplies the first browser render and is then discarded so later navigation cannot resurrect old publication snapshots. The browser retains the existing interactive app and motion controls.

The server reads only the exact dedicated project using its existing browser-safe publishable key and a fresh anonymous client. It does not forward browser cookies/Authorization or use administrative keys. Admin/auth routes receive only the application shell with private/no-store and noindex headers; no private record HTML is rendered. Backend failures return HTTP 503; missing/unpublished article/case slugs and unknown routes return real HTTP 404 responses directly, with no redirect workaround.

Article/case body text, title, description, canonical URL and Open Graph metadata are present in raw HTML before JavaScript. Articles with a cover use a stable `/media/ASSET_UUID` share URL. That route rechecks anonymous asset visibility and downloads only supported editorial image types; it never exposes private bucket paths/tokens in metadata. Cases without approved share artwork omit `og:image`. Ordinary SPA navigation also updates canonical/OG fields and clears stale article-image metadata.

`/sitemap.xml` contains public collections and currently published article/case slugs, plus valid persisted update dates where available. Admin/recovery/submission/draft URLs are excluded. Local `/robots.txt` disallows indexing. `PUBLIC_SITE_ORIGIN` defaults to the explicit local origin, not an invented client domain; production canonical/indexing remain pending. `SITE_INDEXABLE` defaults false. No production indexing approval has been implied.

### Update / invalidation contract

HTML, sitemap and image responses use no-store and query the current public database on every request. There is no rendered-page/CDN cache or rebuild dependency to invalidate. A successful publication/edit/feature update/unpublication/delete/slug change is visible in the **next request**. Old slugs and unpublished records then return 404 and disappear from the next sitemap. Open browser views retain the existing save/focus/reload refresh model; this is not a realtime subscription.

Any future host/CDN cache must preserve this no-store contract or introduce reviewed invalidation covering detail pages, collections, homepage, metadata, images and sitemap. Do not enable caching without that work. Sitemap queries page through published slugs/update times in 1,000-row batches without signing covers. This trades more database queries for a simple correct local update path; large-catalog consistency under concurrent publication, load/latency and host limits still need validation before production.

### Hosting implications

Implementation does **not** select a platform: it requires an ordinary Node 24 process, the two build outputs, an HTTP listener and the dedicated public environment configuration. Local listening is restricted to `127.0.0.1`. No provider SDK, infrastructure configuration, account, paid service or deployment was added. A static-only SPA upload remains insufficient. Choosing a production host, pricing/limits, process/proxy adapter, security headers, approved origin and production Auth redirects remains a client decision before provider-specific work.

The rendered preview normally uses 5190 for independent local inspection. Existing approved Auth recovery redirects are on **5173**, so use the regular app there for password setup. To later inspect rendering on that approved origin, stop the process currently using 5173, set `PORT=5173` and `PUBLIC_SITE_ORIGIN=http://127.0.0.1:5173` in that terminal, and run `npm run preview:rendered`. Do not assume recovery redirects on 5190 are approved.

## Exact manual developer setup (not executed)

The temporary developer administrator is a separate developer account (email and Auth UUID omitted from public repository docs). Its existing private staff row has `role=admin`; it is not the client's account. Keep the address/UUID unchanged. No activation helper is created or supplied.

1. Open the dedicated project's Supabase Dashboard. Under **Authentication → Users**, find that exact UUID and verify the email. Check Auth mail delivery is configured for this recipient and public signup remains disabled. Do not treat a server-generated password hash as completed owner setup.
2. The developer opens **http://127.0.0.1:5173/admin/login**, selects **Forgot password?**, enters their address and requests recovery themselves. This is a future manual email action, not performed by this task. If mail is unavailable, configure/verify the legitimate Auth sender first; do not enable submissions or notifications.
3. Open the recovery email in the **same browser and exact origin** that requested it (existing PKCE flow). Choose a password of at least 12 characters. Verify email ownership/confirmation in Auth and successful authentication for the exact UUID. An inactive account can authenticate but must still see **Staff access unavailable**.
4. Only after password/ownership setup, open **Table Editor → schema `private` → `staff_accounts`** in that same project's trusted Dashboard. Filter `user_id` to the exact UUID above; confirm exactly one row and `role=admin`. Edit **only `active` from false to true**, then save. Do not insert another staff row, change the email/UUID/role, alter RLS or grant arbitrary users access. If the UUID/email/row differs, stop and reconcile it.
5. Sign out and back in at `/admin/login`; confirm the editorial dashboard opens. Verify publishing with approved content or explicitly labelled disposable fixtures. Client onboarding remains separate: obtain their email/role, create/invite their own account with authorization, verify login/publishing, then revoke temporary developer access only if requested after acceptance.

Steps 2–5 are instructions for the authorized human, not completed actions. The developer account remains inactive. Notification recipient and public contact remain separately unconfirmed; neither inherits this email. No recovery email or permission activation was performed.

## Verification and remaining actions

Executed checks:

- **20 focused unit/local HTTP/metadata tests passed**: request sharing, observed-only proactive renewal, hidden-tab return, bounded failures, in-flight Auth identity changes, article/case raw HTML, escaped metadata/bootstrap, publication/edit/slug/unpublish updates, sitemap pagination beyond 1,000 records, private shell/noindex/no-store and 404/405/503 behavior, plus the existing affected provider/hero checks.
- **2 new backend browser scenarios passed** with intercepted transport and a controlled clock: public article renewal/hidden return and private draft-cover failure recovery/denial without losing unsaved title edits. These are not new hosted Storage/RLS claims.
- **11 targeted hero/motion regressions passed across runs**. Ten passed initially; one Full-motion multi-step scenario exceeded its 30-second overall timeout during concurrent checks, then passed in 14.6 seconds in isolation with a 45-second ceiling. No assertion or app workaround was added for the timeout. The WebGL-unavailable scenario intentionally emits renderer errors and verifies fallback selection/navigation.
- **Lint, TypeScript and both browser/SSR production builds pass.** The existing lazy WebGL size warning remains (540.77 kB, 135.95 kB gzip).
- **9 real, read-only connected HTTP smoke checks passed** on the local rendered server: public collections, genuine missing article/case/unknown/media 404s, sitemap and private admin shell headers. Actual remote collections remain empty. No-JavaScript homepage HTML remains readable; JavaScript-enabled 390/1440 layouts have no horizontal overflow or browser exceptions. Raw-response/sitemap JSON and screenshots are in ignored `.qa/rendered-preview`.
- An exact-UUID read confirms the developer's original email, `role=admin`, `active=false`, and unconfirmed email state. No remote activation, Auth recreation, email or schema/content write occurred.
- Final read-only inventory confirms zero active staff, unchanged empty content/storage and disabled intake/notification gates. Scanning all **33 browser/server build files** found zero matches for the project's administrative keys; key values were not written to the report or logs.

Local rendering fixtures do not establish new hosted RLS/Storage proof; the existing live verification is reused. There are no approved published articles/cases/images in the remote project, so local fixtures exercise populated HTML/renewal states without importing sample content. Real-owner recovery/login, production-host behavior and physical-device/load checks remain pending.

Remaining actions: complete developer password/ownership setup and manual activation; obtain client account/role and approved publication/share content; select and approve production hosting/origin, then verify production redirects, headers, crawler access, indexing and load. Keep intake/email/analytics gates disabled pending their separate existing requirements.
