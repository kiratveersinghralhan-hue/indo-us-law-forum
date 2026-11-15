# Local verification — 6 October 2026

This is a locally implemented production candidate, **not launch-ready**. No remote project was connected, migrations applied, fictional content imported, deployment performed or domain purchased. The original working tree was entirely untracked and remains uncommitted. Approved public layouts, routes, motion preferences and mock workflows were retained.

## Checks performed

| Check | Result and evidence boundary |
| --- | --- |
| `npm run lint` | Passed after correcting the motion profiler's browser-global declarations. |
| `npm run build` | Passed, including `tsc --noEmit`; Vite reports the existing lazy Three.js chunk over 500 kB. |
| `npm test` | 51 tests passed across 9 files: original demo/motion workflows plus backend configuration/provider wiring, token renewal/cleanup, published-row requests, featured-case ordering, supported editor serialization, intake/file limits, import/prelaunch checks and SQL grammar. Transport fakes do not establish RLS. |
| `npm run test:browser` | 64 Chromium checks passed on the regular app, including the vertical-touch-intent carousel regression. Widths 320, 375, 390, 695, 768, 1024 and 1440 px; Full/Reduced, welcome choices/dismissal/persistence/session intro, WebGL/fallback/context loss, native touch-scroll emulation, keyboard controls, drag/click distinction, downward/upward scroll motion, resize/orientation, offscreen pauses and route cleanup. Includes public filters/details/unknown slugs/prototype validation and local admin CRUD/publish/unpublish/delete, submission conversion, ordering/settings, public reflection, reset and unsaved-change/mobile behavior. |
| `npm run test:browser:backend` | 5 checks passed: staff sign-in/navigation and actual Tiptap draft saving at 390/768/1440 px, ordinary-user navigation denial, backend error without fixtures and disabled intake. HTTP responses are intercepted; these are UI/adapter checks, not real Auth, database or upload tests. |
| Compiled preview at `127.0.0.1:4173` | Full choice, intro and orbit; local draft/publish/public reflection/reset; mobile/tablet admin framing and no page errors. Isolated browser storage, not the user's content store. |
| `npm run check:sql` | Migration and pgTAP test SQL grammar parsed. No execution, PL/pgSQL compilation, role evaluation or policy enforcement. |
| `npm run check:edge` | Pinned Deno type check passed for the prepared intake endpoint. |
| Disabled intake HTTP gate | Standalone local Deno endpoint returned allowed-origin POST 503, disallowed/missing-origin POST 403, allowed OPTIONS 204 and allowed GET 405. No accepted submission, CAPTCHA verification, database or storage request was exercised. |
| Import template | CLI rejects the empty structural template without an actual approval reference/date, as intended. Unit checks cover valid reviewed manifests, malformed/private fields and prelaunch gaps. No real content import was performed. |

## Motion findings and changes

The existing carousel uses one transient GSAP rotation tween with coalesced drag updates; it does not set React state each animation frame. Readable title/excerpt/link remain outside moving covers. The hero retains its separate offscreen/hidden-tab pause and resource cleanup.

A real interaction defect was identified: pointer-down killed a selection tween before horizontal drag intent was established. A vertical touch gesture could therefore leave the orbit between articles. Rotation now transfers to dragging only after horizontal intent, using the current angle as its origin. Vertical scrolling and non-drag cancellation leave the intentional rotation running. A browser regression confirms the selected rotation settles during vertical touch intent. Saved backend featured-case order now also controls the repository preview.

Covers retain CSS 3D and gain a small front/back separation, static spine/page edges and restrained shading/selected emphasis. No competing carousel, extra animation loop, postprocessing or scroll library was added. Reduced mode retains the conventional accessible carousel.

`node scripts/profile-motion.mjs` measured four Next selections over 2.4 seconds in isolated headless Chromium on Windows, 1440×900, DPR 1, explicit Full mode, without CPU/network throttling. The run recorded 142 animation callbacks, median 16.7 ms and 95th percentile 16.7 ms; readable-copy DOM updates occurred four times, once per selection. Renderer: ANGLE/Vulkan SwiftShader software GPU. These are callback scheduling measurements, **not** isolated GPU cost, physical-device FPS or a universal smoothness guarantee. Local artifacts are in ignored `.qa/motion-profile.json` and `.qa/completion-carousel-desktop.png`; the browser suite also records `.qa/recordings/public-scroll-full.webm`.

## Unavailable validation and launch blockers

`npx supabase start` failed because neither Docker nor Podman is available. `npm run test:security` could not connect to `127.0.0.1:54322`. All migrations remain unapplied. Direct pgTAP and local Auth/CRUD/Storage/concurrent-conversion HTTP tests are prepared but **unrun**. Database security is unverified; frontend tests cannot substitute for it.

Real staff provisioning/login/recovery, revocation, database constraints and RPCs, draft/submission privacy, restricted uploads, signed-URL behavior and accepted intake/CAPTCHA/rate limits/gateway-header provenance require a working dedicated local stack, then separately authorized hosted validation. Public delivery remains disabled through independent server/database gates. No live analytics collector exists; the dashboard says “Analytics not connected.”

All browser device checks are Chromium emulation. Physical Android/iOS/tablet performance, Safari behavior, recovery email delivery, slow-network cold loading and long-session use remain untested. The lazy WebGL chunk is 536.24 kB minified / 134.43 kB gzip; the lazy maintained editor is about 395 kB / 125 kB gzip. Verify cold-load and memory behavior on actual devices before launch; the chunk warning was not suppressed.

Approved branding/copy/assets/records, case metadata, publishing permissions and privacy/retention decisions remain pending. The offline prelaunch checker cannot establish actual asset URL availability. Hosting remains unselected: reliable per-article HTML/social metadata, sitemap updates, cache invalidation and actual HTTP 404s still require the selected SSR/prerender strategy and its configuration. Local history routing and noindex are deliberate current defaults.

## Review and next steps

Run `npm ci`, then `npm run dev` for the unchanged mock review; compiled local review uses `npm run build` and `npm run preview`. In an isolated browser, choose Full and inspect the research covers using Next/Previous, arrow keys or horizontal swipe; vertical scrolling remains native. The existing motion control switches to Reduced.

Follow [backend setup](backend-setup.md) for exact local runtime, test-account, provisioning, Auth, bucket and disabled-intake steps. Follow [the single intake/import guide](client-content-intake.md) for approved replacements. Approve [the hosting/SEO strategy](hosting-seo-strategy.md) before host-specific configuration. Remote apply, deployment, purchases and public-intake activation require their separate authorization and successful prerequisite checks.
