# Public frontend verification — 3 October 2026

Historical verification of the preceding public pass. The later [motion experience verification](motion-experience-verification.md) supersedes its motion/default/carousel behavior and test totals. It supersedes earlier diagnostics describing width-based fallback, a session-only reduction toggle or an OS preference that could not be explicitly overridden. All testing is local; there is no deployment or hosted readiness claim.

## Change boundary

The existing React/router/provider architecture and sample routes were retained. The homepage now composes a balanced sculpture hero, numbered focus rows, one large featured-research carousel, two supporting reads, a charcoal repository sequence, neutral team preview and a contribution panel. Public collections/details/form received matching editorial framing. Search, filtering, structured content, unknown-slug views and validation-only submission remain intact. Admin stays unavailable.

Five original local SVG illustrations replace important empty visual areas. Brand and editorial copy, artwork captions/alt text and fixture content have editable central sources. The [content checklist](content-checklist.md) maps samples to required client material; samples must be replaced or deliberately removed/reworked before delivery. No fake statistics, testimonials, real-looking team identities or client achievements were added. No blanket content-hiding production switch exists.

No Supabase connection, schema/database work, credentials, authentication, publishing, email, uploads, paid-service integration, purchase, domain registration, remote push or deployment was performed. Submission text stays in the live form only. The only persistent UI preference is the authorized nonpersonal motion selection.

## Motion behavior and browser verification

The header's Motion select defaults to **System**, following the live OS/browser preference. **Reduced** always reduces motion. **Full** enables motion only through explicit visitor selection, including when the OS requests reduction; the current scope expressly authorizes this override. A validated preference is stored as `editorial-motion-mode`. Unavailable storage falls back to System. Mode changes immediately reconfigure Three.js and revert/recreate GSAP effects. CSS follows the same effective mode.

| Effect | Verified behavior |
| --- | --- |
| Real hero canvas | Regular homepage mounts at 320, 375, 390, 695, 768, 1024 and 1440px in System/allowed, System/reduced and explicitly selected Full under OS reduction. Reserved stage fits container dimensions, with no text overlap or horizontal overflow in the checks. |
| Still 3D | Reduced/System+OS reduction renders the real composition, without recurring frame requests; resize/orientation emulation triggers a redraw and framing update. Reduction does not activate SVG fallback. |
| Float and scroll | Allowed/Full advances frame counters; native touch and wheel scrolling progress hero depth/orientation. A desktop down/up sequence confirms depth returns toward its starting value. |
| Pointer behavior | Fine-pointer movement drives damped rotation and supporting-card tilt. Touch events do not drive rotation or tilt and do not prevent vertical scrolling. |
| Featured artwork | One coordinated carousel artwork parallax runs at all widths: ±14px up to 860px, ±28px above, with small scale change. Smaller-screen scroll tests confirm transform progression. Reduced mode removes the effect. |
| Repository sequence | Desktop introduction is bounded CSS sticky; scroll changes archive artwork framing, upward scroll reverses its translation and the introduction releases with its section. At 1080px and below it uses normal static flow. |
| Reveals | Translation-only GSAP reveals discover async content, use smaller compact movement, and never hide text. They can reverse/replay when retreating before the entry threshold; settled reading content stays visible. The entrance label never blocks content, navigation or WebGL loading. |
| Fallback | The regular homepage retains matching SVG/navigation when WebGL initialization is intentionally unavailable; actual `WEBGL_lose_context` restores it on context loss. Expected Three.js warnings/errors occur only in these deliberate failure checks. |
| Cleanup / suspension | Route changes remove the old canvas and allow a clean remount. Offscreen frame counters stop. Unit tests verify hidden-tab suspension/resumption, event/observer/tween/resource cleanup, drawing failure and optional ScrollTrigger failure isolation. Hidden-tab suspension was not measured on physical hardware. |

## Checks performed

- ESLint and strict TypeScript: passed.
- Vitest: **22 tests in 4 files passed**. Includes provider search/filtering and clone/unknown behavior; stored/live motion policies; real geometry with a mocked renderer; responsive framing, still redraw, detail tiers, pause/resume/failure/cleanup; SVG XML validity and dimensions.
- Playwright: **31 tests passed in the final complete run (2.4 minutes)** against the **regular application**, using an isolated Vite server on `127.0.0.1:5181`. It covers seven homepage sizes/motion policies, orientation resizing, native touch/wheel scroll, context failure, live mode changes, carousel and public-route tours. Test-only `browser-test` mode disables hot reload/file watching so generated QA files and concurrent documentation work cannot invalidate the page under test; ordinary development hot reload is retained.
- Seven explicit Full cases exercise previous/next endpoints, count, Home/End/arrow navigation, horizontal touch swiping through native scroll-snap and local image loading. The test confirms no automatic slide change over a short interval; source inspection confirms there is no autoplay timer.
- Public-page tours at 320, 390, 768 and 1440px exercise mobile menu Enter/Escape/focus return; article search plus category, counts/reset/empty result and retained input focus; case search/category/type filtering/reset; valid article/case details, related samples/source note/tags and unknown slugs; required-field error focus, valid fictional fields, no POST and no form-text persistence; unavailable Admin. Loaded images and root overflow are checked throughout.
- Desktop short recording verifies normal down/up scrolling, 3D framing, carousel controls, repository movement/release and immediate reduction cleanup. Tablet carousel testing was repeated three times after waiting for native touch inertia/snap to settle before a separate keyboard gesture; all three passed.
- Production build: passed. `dist/` contains the local artwork and excludes the QA HTML fixture and development-only frame/pointer diagnostics. Lazy Three.js chunk: **535.72 kB minified / 134.26 kB gzip**; the existing Vite size advisory remains. Main JS: 425.44 kB / 140.70 kB gzip; CSS: 45.69 kB / 9.86 kB gzip. These are bundle sizes, not measured download/interaction performance.
- In-app browser inspection of the built `http://127.0.0.1:4173/` preview confirms the real canvas becomes ready, System reports OS reduction, explicitly selected Full becomes effective, and the hero has no horizontal overflow. The second carousel link resolves its sample article and removes the canvas on route change; Research note filtering yields two case records. The preview was returned to System and temporary viewport emulation was reset after testing.

## Review artifacts

Generated artifacts are ignored local QA output, not shipping assets:

- `.qa/public/home-desktop.png`, `home-390-full.png`, `home-768-full.png`: complete homepage compositions after artwork has loaded.
- `.qa/public/carousel-desktop.png`, `repository-desktop.png`, `production-hero-tablet.png`: editorial carousel, repository and actual built-preview hero.
- `.qa/public/{team,articles,article-detail,cases,case-detail,submit}-{390,768,1440}.png`: route screenshots with sample content/validation.
- `.qa/recordings/public-scroll-full.webm`: short desktop Full demonstration. Browser emulation/software rendering can make recording motion look less smooth than native hardware.

Two actual visual issues found during screenshot review were fixed: supporting artwork's aspect ratio expanded across card text, and an unfilled SVG guide path formed a black triangle. An intermediate SVG edit produced duplicate XML attributes; corrected SVGs now load and an XML parsing test protects their validity. A page-tour Admin assertion was corrected to the existing unavailable heading. Full-page screenshot capture begins at the top to avoid Chromium painting the offscreen fixed skip link inside a long capture; the live skip-link behavior remains unchanged.

## Limits and client decisions

All listed device sizes, touch gestures, orientation and OS-motion conditions use **Chromium emulation**. No physical phone/tablet, Safari/iOS, Firefox, real GPU power/thermal, slow-network, battery, screen-reader or formal accessibility audit was performed. No production/hosted deep-link/SEO or HTTP-status behavior was tested. Lazy-load error handling remains in the local scene boundary; network-induced chunk failure was not separately browser-tested in this pass.

The scene still caps DPR/detail/frame rate, pauses offscreen/hidden, uses no expensive shadows/postprocessing and retains a matching failure/loading fallback. Real low-power device checks remain necessary. System stays the visitor default; explicit Full is optional and reversible. Sample content, identities, taxonomy, media and editorial permissions remain unresolved. See [client decisions](client-decisions.md) and [handoff checklist](content-checklist.md). Stop at this public frontend increment.

Final complete browser suite result: **31 passed**, exit code 0. Earlier runs exposed invalid SVG XML and test gesture/screenshot timing; a separate unexpected development-server reload was avoided by freezing the isolated test server. The final checks passed without retries.

After correcting singular “1 sample record” wording, all four affected public-page tours were rerun and passed (43.6 seconds). Lint, strict type checking and the production build were also rerun successfully. No scene or interaction behavior changed in that copy correction.
