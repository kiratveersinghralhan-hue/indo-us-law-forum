# Managed publication hero and experience finish — 10 October 2026

This focused pass follows the replacement request. The existing individually selectable 3D publication composition, geometry, single WebGL canvas and separate CSS 360° article carousel are retained. Public routes, provider abstraction, Supabase integration, staff authentication/authorization, CRUD/review/conversion, case/team editors and unsaved-change guards remain in place. The original tree was entirely untracked; no reset, commit, push or deploy was performed. No AGENTS.md was found in the workspace or checked ancestors.

## Content and administration

- **Homepage & content → Featured articles** selects published articles, orders them with accessible Up/Down buttons and removes features without deleting records. Each selected item previews its actual title, excerpt and cover and links to its article editor. The **first three** ordered records appear in the hero; the carousel uses the entire same managed selection. No separate cover override is needed.
- Article IDs are now retained by public projections. The hero and carousel remember selection by ID, including their initially displayed record, when ordering changes. Hero buttons identify the individual article; readable title, category, excerpt and exact `Read article` route match the selected cover. Selection changes depth without recreating the scene; the carousel owns full rotation.
- Mock covers can now be saved through the existing local image input instead of remaining temporary previews. Supported PNG/JPEG/WebP signatures are checked. **Mock files are limited to 768 KB** to respect the existing 2 MB serialized demo-store limit; storage-full failures remain explicit. These fictional demo covers persist in the existing browser-local namespace, including reload and same-origin tab updates. They are not uploaded to a server or shared across devices. Other local profile previews retain their original preview-only behavior.
- Backend covers continue through existing private editorial media upload/storage and signed-URL resolution, with the existing **3 MB** limit. Actual uploaded asset descriptions remain authoritative. No bucket, MIME, permission or privacy boundary was widened. No backend upload was performed in this pass.
- Unpublished/deleted articles disappear from the public selection. Empty selections show an honest edition-in-preparation message and one neutral typographic organization cover, without an invented article/link. One and multiple selections have bounded layouts. Real articles without media use the neutral branded cover; fictional bundled studies are reserved for explicitly labelled mock records. Failed image loading retains a neutral fallback.
- The existing revision subscription deliberately refetches public content after saves. Backend refresh clears cached references and reloads settings; returning focus to a backend window also refetches. No rebuild is required for content changes. This is not a realtime/cross-device delivery guarantee; an already-open remote tab needs focus/refetch or reload.

## Presentation and experience

Midnight navy/white, black body text on white and white text on navy are retained. Cover artwork fits within the volume without stretching or cropping; texture anisotropy and cover material finish are refined. The scene retains damped pointer depth, selection, scroll response, still rendering, offscreen pause, touch scrolling, context-loss and failure fallbacks. Text and controls remain outside moving covers.

The header motion dropdown is removed. The welcome is **“How would you like to explore?”**, with equally prominent **“Plain website”** and **“Experience full motion”** choices. Until a choice, decorative motion is off. Both choices wait for exit completion before unmounting; OS reduction uses a short opacity-only dialog transition. Dismissal selects Plain for the session, including over an older Full preference. Explicit choices persist; legacy explicit System migrates to Plain and old automatically stored System receives the welcome. Footer **Experience settings** reopens it and restores focus to the trigger. Scroll locking and cleanup are covered.

The typographic Indo-US Law Forum intro runs only on the homepage after Full, once per session, for **2.05 seconds**, with Skip/Escape and timeout completion independent of WebGL. Fine lines and restrained dimensional frames support the name reveal; no official logo was invented. Admin has no cinematic intro or decorative canvas. Its sidebar/mobile navigation, headers, record/status treatments, media/feature previews, fields, validation, save controls and notices are restyled. Short functional transitions respect reduction. **Analytics not connected** remains unchanged.

## Database preparation and proof boundary

Existing `featuredArticleIds`, `featured`, publication status and `cover_asset_id` fields are reused. Additive local migration `20261010093441_managed_published_features.sql` validates distinct published article references on homepage writes, normalizes draft feature flags and synchronizes article feature/unpublish changes with the ordered homepage source. Existing delete pruning, published-only public RLS, staff-only management policies/RPC grants and optimistic revision checks are retained. Internal trigger functions are not exposed to callers. All three migrations must be reviewed/applied to an authorized dedicated test backend before relying on the new trigger behavior.

The original migrations are unchanged against the before-pass backup:

- `20261006151855_editorial_backend.sql`: SHA-256 `E9FDF05FC5C2F2D8E7882E87D6E2D543C67A99444EA9F630CF1F0E6B9C172C07`
- `20261010084746_confirmed_categories_and_submission_notifications.sql`: SHA-256 `9162A0FBA52108D1892CA0D1370DF8BD57EE41A8B501E1131D8EA7C44BD8FFE9`

No migration was applied locally or remotely. `supabase/tests/managed_features.test.sql` prepares transactional pgTAP checks for anonymous/nonstaff denial, published selection, duplicate/draft rejection, feature synchronization, unpublish and delete pruning. Grammar parsing does not compile PL/pgSQL or evaluate grants/RLS/triggers. `npm run test:security` was attempted: local Postgres at `127.0.0.1:54322` refused the connection. Docker/Podman remain unavailable. Actual DB/RLS/storage, concurrent saves and hosted authorization remain unverified. Transport fakes are clearly separate from this proof.

Live submission and email delivery stay disabled by the existing source readiness gates, with no provider calls, schedule or changes to intake policy/storage. Approved publication content, logo/team identities, contact/domain/hosting, staff provisioning and analytics configuration remain pending. Backend mode does not substitute mock records on failure.

## Verification and evidence

| Check | Result |
|---|---|
| ESLint, TypeScript and production build | Passed; existing lazy WebGL chunk warning (~541 KB minified) remains |
| Unit tests | 64 passed, including managed content, preference lifecycle, stable selection, mock cover persistence and backend invalidation wiring |
| Public/admin browser regression suite | 78 scenarios verified: 77 passed in the full run; the final WebGL-fallback keyboard test passed on targeted rerun after correcting its old category-based button label to the new article-based accessible name. No remaining test failures |
| Backend browser checks | 7 passed with intercepted HTTP, including the empty publication source; not real Auth/RLS/storage proof |
| Edge function checks | Both handlers type-check; 1 network-denied regression confirms intake/email remain disabled even with environment flags |
| SQL grammar | All 3 migrations and 3 pgTAP files parsed; no database code executed |
| Visual capture | 24 public/admin layouts at 390, 768 and 1440 px plus actual admin-to-public interaction; zero overflow/page errors |

The browser matrix also covers 320/375/390/695/768/1024/1440 px, explicit Full/Plain, OS reduction, keyboard/carousel navigation, touch scrolling, WebGL unavailable/context loss and cleanup. Managed-feature checks exercise zero/one/multiple/capped selections, accessible ordering, stable IDs, saving/refetch, actual local cover replacement and exact article routing, draft exclusion, unpublish/delete and removal without deletion.

Artifacts are in `.qa/managed-hero/`: homepage and public/admin screenshots for desktop/tablet/mobile, `welcome-desktop.png`, `intro-desktop.png`, `admin-feature-order.png`, `public-after-admin-save.png`, `carousel-after-admin-save.png`, `capture-checks.json` and **`admin-to-public-interaction.webm`**. The 14.4-second recording uses only explicitly fictional browser-local content; its WebM stream was independently inspected and remuxed successfully. Reproduce with `node scripts/capture-managed-hero.mjs` while the production preview runs on `127.0.0.1:5173`. The capture uses isolated browser contexts and does not overwrite the user's demo store.
