# Launch checklist — 12 October 2026

> Local readiness update — 17 October 2026: The controlled local promotion is complete. The 15–16 October offline validation and 17 October relocation smoke check passed. The entries below retain their 12 October evidence dates. Hosted SHA/settings, live backend behavior and remaining release dependencies have not been reverified by the local transition. Production launch remains unapproved.

**Not ready for production launch.** Free noindex client review is live at https://indo-us-law-forum-review.onrender.com, deployed from `f290c0f`. Only backend target: `erwliwgbjlutczmtqoss`. Design, data and permissions are preserved. Submissions, notifications, analytics and production indexing remain disabled. Existing workflow/security proof is reused; this review added real hosted sign-in and read-only checks.

## Completed and verified

- [x] Host-neutral enforced CSP/nonces, framing/referrer/permissions protections and local font delivery: 16 focused tests and three production-renderer Chromium scenarios passed; backend interactions were mocked. Lint, TypeScript and browser/SSR builds passed. [Security-header evidence and rerun limits](security-headers.md).
- [x] Public routes/design, 3D covers, carousel, Full/Reduced preferences, fallbacks, keyboard/touch behavior: Chromium checks at 320–1440px. [Presentation](confirmed-requirements-verification.md), [motion](responsive-motion-verification.md).
- [x] Supabase connection/five migrations, CRUD/settings/features/order, private Storage, published-only reads, staff denial/revocation and conversion: **86 real SQL assertions / 152 live API/browser checks**, with disposable fixtures cleaned. [Backend proof](dedicated-backend-verification.md).
- [x] Numbered content validation, authorless drafts, approved-author publishing, safe upload/save retry: real draft/cover/publish/unpublish/anonymous checks on 10 October. The original unspecified image failure remains unreproduced. [Editor proof](admin-editor-auth-fixes.md).
- [x] Local article/case HTML/metadata, stable images, sitemap, real 404/503 and next-request updates through anonymous reads/no-store: fixture tests plus nine connected read-only smoke checks on empty collections. [Rendering proof](remaining-work-implementation.md).
- [x] Author UI approval/refresh/retry and edit/cover preservation: **14 unit / six mocked browser scenarios**, including 390px overflow; one timeout passed on targeted rerun. Latest lint, TypeScript and browser/SSR builds passed; WebGL size warning remains. Counts overlap older suites. [Author proof](author-management.md).
- [x] Free Render SSR review: private repository access restricted to this repository, Linux build/first deploy at `f290c0f`, Auto-Deploy Off, Blueprint Auto Sync No, PR previews Off, Hobby/no card/$0.00. **18 real hosted HTTP probes + HTTPS redirect**, 390/768/1440px layout checks, Full/Reduced choices and single WebGL initialization, real staff login and reload passed. Noindex/CSP/no-store and genuine 404s verified. [Hosted results and limits](hosted-review.md#hosted-verification-and-remaining-limits--12-october).

## Implemented, awaiting real verification

- [ ] Live Auth sign-in under CSP and effective hosted app headers passed; private Storage/signed-image compatibility, Safari/Firefox and physical devices remain pending. HTTPS works, but **HSTS is absent**; production host/proxy configuration and provider-generated error headers remain pending.
- [ ] Hosted acceptance with approved articles/cases/covers and carousel, publication updates, repeatable cold-start timing and client review. One natural cold wake returned successfully after Render's loading interstitial. Existing empty homepage-settings warning persists; a transient phone content error recovered through Retry, but its timing/network cause remains undiagnosed. [Hosted limits](hosted-review.md).
- [ ] New author UI with client-entered details: approve/select, save/reload and publish. Latest follow-up created no real author; RLS was inspected read-only.
- [ ] Signed-image renewal/hidden-return/failure recovery: local/mocked proof only. Verify real long sessions; issued URLs can survive unpublication for five minutes.
- [ ] Full Auth-mail/PKCE recovery: mocked presentation proof only; exact hosted recovery redirect and authorized mail test remain pending. Updated hosted sign-in and real developer access/reload passed on 12 October; do not repeat activation.
- [ ] Production rendering/SEO: approved content, canonical/share URLs, deep links, sitemap updates, 404s, private responses, cache behavior and load. Vite SPA preview is insufficient.
- [ ] Disabled intake/notification preparation: accepted intake, CAPTCHA/rate/gateway/worker controls and provider/inbox delivery need end-to-end proof. Prior live queue/privacy checks do not establish delivery. [Boundaries](submission-delivery-preparation.md).

## Remaining technical work

- [ ] Production host/domain decision, HSTS/proxy configuration, Auth redirects, monitoring/backups; preserve no-store or review invalidation. The Free review Node/origin/HTTPS setup is complete. Verify load/concurrency, physical devices/Safari, accessibility and cold-load/memory; diagnose intermittent browser content loading with sanitized timing evidence before choosing a fix.
- [ ] After policy decisions: implement Word/combined-size validation, scanning/quarantine/retention, orphan reconciliation and chosen anonymity/reviewer workflow; test abuse controls/reconciliation. Word, double-blind review and analytics remain unimplemented.
- [ ] Client onboarding/recovery, acceptance and approved-snapshot validation: `npm run check:prelaunch -- PATH_TO_APPROVED_SNAPSHOT.json` remains pending. Docker/Podman local-stack tests remain unavailable; hosted proof is separate.

## Decisions and material required from the client

- [ ] Approved authors/articles/citations/dates/covers/rights, cases/taxonomy/documents, team/portraits/consent, logo, homepage/contact copy and category publication. No sample imports.
- [ ] Client login email/role/publishing authority and later developer-access decision. Keep the developer identity unchanged and login/notification/public-contact addresses separate. [Handover](developer-client-handover.md).
- [ ] Production domain, Node-capable host/budget, canonical/share identity, operating owners and indexing/release authority. Temporary Free Render review is approved and live.
- [ ] Submission PDF/Word requirements/limits, guidelines, consent/rights/privacy, scanning/retention, anonymity/review authority; separate recipient/sender/provider and sandbox-testing authorization.
- [ ] Revocation timing, password-protection/plan decision, backup/retention, analytics/privacy and final content/motion/launch acceptance. Analytics may stay disconnected. [Decisions](client-decisions.md).

## Security-header follow-up

The host-independent header task and review deployment are implemented. Live sign-in and app response headers passed, while private Storage/signed images, production HSTS/proxy errors, cross-browser and physical-device compatibility remain pending. Retain noindex/no-store and the nonce contract. [Configuration](security-headers.md), [hosted proof limits](hosted-review.md).
