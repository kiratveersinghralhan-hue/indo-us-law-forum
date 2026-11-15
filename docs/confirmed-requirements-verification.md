# Indo-US Law Forum increment — 10 October 2026

## Implemented locally

- Confirmed name, student research purpose and Read articles / Submit an article actions across navigation, homepage, footer, intro/dialog, page metadata and admin identity. The typographic wordmark awaits the official logo.
- Navy/white surfaces, black body text on white and white text on navy. Existing layouts, licensed fonts, original local artwork, cover selection/depth, one WebGL scene, 360° carousel, touch scrolling, Full/Reduced preferences and static/failure fallbacks remain.
- Four exact article categories centralized with stable public slugs. Public/backend filters resolve slugs to existing UUIDs; admin selectors retain record UUIDs. Fresh demo seeds add four explicitly fictional research outlines. Legacy sample articles/cases/submissions retain IDs/category relationships and are marked mapping pending. Persisted valid old demo stores gain taxonomy in memory; custom copy, drafts, records and storage are preserved. Only untouched old hero defaults are updated. No reset/import is performed.
- Separate disabled PDF and Word controls with pending requirements stated. Existing PDF validation/storage restrictions remain. Word acceptance is not implemented or enabled. Shared source gates prevent remote flags from enabling incomplete intake.
- A local additive migration prepares exact category slugs/unpublished taxonomy and a private service-only notification outbox. No legacy reclassification or historical submission backfill occurs. Acceptance is transactionally separate from email delivery, with matching-content retries returning the same reference. Prepared worker uses minimal reference/authenticated-admin links, leases, bounded retries, stable provider retry keys and sanitized failures. Provider/recipient/credentials are placeholders; delivery and scheduling are off.
- Private originals/identities, separate submissions, draft conversion and explicit publication are preserved. Admin warns that approval does not certify a completed double-blind review. Manual anonymization/email review versus website reviewers remains a decision; no reviewer system is built.
- Repository introduction reflects India–US company disputes; all current records remain samples. No legal authorities, citations, holdings or exhaustive collection claim were created. SEO/default browser metadata and hosting strategy are updated. Visitor analytics remains disconnected with no sample traffic.
- Updated client decisions, content checklist/intake and submission/hosting preparation documents.

## Checks executed

| Check | Result / proof boundary |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` / production build | Pass; build runs TypeScript first |
| `npm run test` | 58 unit regressions pass, including taxonomy/legacy preservation, draft conversion, provider failure boundaries and mocked email transport/retry results |
| `npm run test:browser` | 74 pass: public/admin workflows, all four categories, sample filters/details/unknown slugs, responsive identity, intro/preferences, pointer/keyboard/cover controls, 360° carousel, touch scrolling and failure fallbacks |
| `npm run test:browser:backend` | 6 pass using intercepted HTTP: backend editor, access denial, no fictional fallback, disabled uploads and exact taxonomy with retained UUIDs. Not real Auth/RLS/storage proof |
| Final admin-review and backend-sign-in/category spot checks | Pass after final boundary/identity copy updates |
| `npm run check:edge` | Both server functions type-check |
| `npm run test:edge:policy` | 1 native handler test passes with outbound networking denied; intake/notification return disabled even with environment enable flags set |
| `npm run check:sql` | Both migrations and both pgTAP files parse; no SQL applied, PL/pgSQL compiled or RLS evaluated |
| Screenshot capture | 15 layouts across home/articles/cases/team/submit at 390, 768 and 1440 px in Reduced; no horizontal overflow or page errors. Full hero/carousel/repository, intro/dialog and interaction recording also captured |
| Additional responsive/motion browser matrix | 320, 375, 390, 695, 768, 1024 and 1440 px, Full/Reduced, touch/keyboard and WebGL unavailable/context-loss states |
| Content approval check | The empty `docs/content-import.example.json` is correctly rejected for missing actual written approval/date. No approved content manifest or launch snapshot supplied; no import attempted |

Visual inspection covered desktop/mobile compositions, contribution controls and the Full hero. An inherited black repository surface was corrected to navy; inherited active-navigation and submission-instruction colors were corrected to white on navy and covered by computed-color browser checks. The build retains the existing warning for the lazy WebGL chunk (~541 kB minified). No broad code splitting or scene rewrite was introduced.

The original `20261006151855_editorial_backend.sql` is unchanged from the pre-edit backup (SHA-256 `E9FDF05FC5C2F2D8E7882E87D6E2D543C67A99444EA9F630CF1F0E6B9C172C07`). The worktree was already entirely untracked; no commit/push was made and unrelated work was retained. No AGENTS.md was found in the workspace or its checked ancestors.

## Evidence

Local artifacts under `.qa/confirmed-requirements/`:

- `home-desktop-reduced.png`, `home-tablet-reduced.png`, `home-mobile-reduced.png`
- Matching article/case/team/submit screenshots for each viewport
- `home-desktop-full.png`, `carousel-desktop-full.png`, `repository-desktop-full.png`
- `intro-desktop.png`, `motion-dialog-desktop.png`
- `homepage-interaction.webm` and `capture-checks.json`

Reproduce with `node scripts/capture-confirmed-requirements.mjs` while the built local preview runs at `127.0.0.1:5173`. Browser regressions start isolated dev servers on 5181/5182.

## Remaining blockers

Docker/Podman are unavailable. Both migrations and direct security/queue SQL tests remain unapplied/unexecuted locally and remotely. Real RLS/storage, trusted gateway/CAPTCHA/rate controls, concurrent request/worker behavior, provider acceptance, inbox delivery and authorized hosted access remain unverified. Retained staging objects after uncertain acceptance need a trusted reconciliation/cleanup process; cross-session retry recovery is not implemented.

Before intake: confirm both-required PDF/Word behavior, extensions/limits, contributor fields, consent/guidelines, scanning/retention and reviewer/publishing authority; implement/test approved Word acceptance without weakening existing private storage. Before email: choose actual provider/recipient/verified sender and test worker authorization/retry/reconciliation with approved sandbox delivery. No real emails or schedule were created.

Before launch: supply approved logo/team/articles/case example/collection/contact details, confirm editor permissions, content/launch dates and motion sign-off. Select domain/hosting and implement server-rendered or publish-triggered prerendered detail HTML, public metadata/share images, sitemap, HTTP statuses and invalidation before enabling indexing. Browser metadata alone does not complete Google/social visibility. Analytics provider/privacy/retention remain pending and tracking is disconnected.

No remote migration, project creation, deployment, service purchase, real email or production sample-content import was performed.
