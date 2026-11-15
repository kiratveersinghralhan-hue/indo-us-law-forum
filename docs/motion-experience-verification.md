# Motion experience verification — 3 October 2026

Current local public-frontend increment. This supersedes the previous public-pass report for welcome defaults, carousel presentation, motion implementation and test totals. Routes, fixtures, filters, provider boundaries and validation-only content workflows are preserved. No Supabase, authentication/CMS, transmission, deployment, purchase, commit or remote push occurred.

## Observations and actual fixes

The real homepage was inspected in explicit Full before changing motion. One hero canvas and one scene RAF were present; offscreen suspension worked. There was no duplicate persistent WebGL loop or postprocessing to remove. The compact/desktop frame sampler observed approximately 50 ms median and 95th-percentile gaps despite the old 24/30 fps settings. Source inspection found budget drift from replacing each render timestamp with `now`, repeated ready attributes and redundant size/DPR operations, repeated whole-page reveal scans following carousel content changes, repeated pointer geometry reads and two layers of slow scroll/damping response.

- Frame pacing now advances a stable fractional budget with tolerance; initial/long-idle frames reset its anchor. Compact detail caps at 30 fps, desktop at 60; existing low DPR/detail tiers remain. Regression tests protect fractional RAF boundaries against drifting or accidentally exceeding the compact cap.
- Renderer size/DPR changes are guarded; ready status is written only on readiness. Pointer geometry is cached and invalidated on resize/native scroll. The reveal observer processes newly inserted groups rather than all page nodes after text changes. Native carousel selection avoids redundant React updates. Scroll scrub/damping and transient card/orbit easing are coordinated without altering native scrolling.
- Reveal cleanup testing exposed lazy start-at styles remaining after Reduced selection. Triggers are now killed before context reversion, then reveal-owned opacity/transform are cleared. Content never reaches zero opacity and has no hidden CSS prerequisite.
- Touch tests exposed a bubbled implicit-capture loss cancelling a drag when capture transferred from a cover child to its container. Only loss of the stage's own capture cancels its gesture. Vertical intent is left to the browser before horizontal capture.
- Actual built-preview cover clicking exposed an invisible camera layer intercepting clicks on rear covers. The camera now passes pointer hits through to the visible faces. A cover-click regression verifies selection and that covers never navigate directly.
- Visual inspection exposed opacity flattening 3D cover groups and overflowing miniature titles. Opacity now belongs to individual faces; miniature titles are bounded while the complete readable title stays outside the moving composition.

An isolated two-second Chromium sampler after the final engine changes observed:

| Viewport | Before median / p95 gap | After median / p95 gap |
| --- | --- | --- |
| 390px | approximately 50 / 50.1 ms | 33.3 / 33.4 ms |
| 1440px | approximately 50 / 50 ms | 16.7 / 16.7 ms |

One canvas was observed in each sample. These short RAF-observed samples support a pacing improvement; they are not GPU-time, whole-page responsiveness, thermal, battery or physical-device benchmarks. Concurrent browser testing changed sampling conditions, so the reported final sample was taken separately. No guaranteed smoothness is claimed.

## Preference and experience behavior

New visitors start Reduced. A compact native dialog renders independently of content/WebGL and offers the exact requested title, description and equal Full/Calm actions. It explains OS reduction when requested. Escape or the dismiss control keeps Reduced for this visit; focus is contained and restored to the prior target or header control. No loading intro delays access.

Explicit Full/Reduced choices persist as `editorial-motion-mode`, with `editorial-motion-choice-made` recording an explicit selection. New explicit System choices follow the live OS setting and are remembered. The earlier automatically stored System default receives the welcome once; existing Full/Reduced choices remain respected. Dismissal alone uses `editorial-motion-welcome-dismissed` in sessionStorage and does not persist a decision. Storage failure leaves the app usable but may cause the welcome to recur on another visit. These are nonpersonal preferences only.

Full evolves the existing single carousel into three sample article covers in a CSS 3D arrangement. A brief entry orientation cue settles without changing selection. Bounded horizontal drag/swipe and cyclic previous/next controls rotate through a complete cycle; keys/dots reach every article. Cover clicks select; only the stationary article link navigates. Decorative covers have no keyboard focus targets. A polite announcement updates once per selection, not per frame. No endless autoplay, second carousel, second WebGL renderer or scroll library was added.

Reduced, System and unsupported CSS 3D retain the conventional accessible carousel. Reduced keeps real hero 3D still, without continuous rendering, floating, parallax, tilt or entrance reveals. Full remains an explicit optional override of OS reduction. Native vertical scrolling and pinch gestures remain available. Orbit tweens pause offscreen/hidden; its RAF, observers, pointer/visibility/resize listeners and tweens dispose on mode/route changes.

Explicit Full adds selected heading/content fade-and-rise and contribution-art reveals. They replay only after completely leaving and re-entering the viewport, then settle with clear styles while reading. The orbit's camera owns bounded reversible scroll framing; its rotor independently owns angle. Existing hero depth/orientation and desktop repository framing reverse on upward scroll. Smaller distances apply on compact screens. Article-reading pages retain their calm existing translation behavior.

## Executed checks

- ESLint, strict TypeScript and production build passed.
- Vitest: **26 tests in 4 files passed**. Includes provider behavior, asset validity, preference/storage/fresh-visit policy, responsive real geometry with a mocked renderer, fractional frame caps, still redraw, pause/resume, failure recovery and disposal.
- Playwright: **44 tests passed** against the regular homepage and public routes in isolated Chromium, not the separate QA fixture. The test server uses port 5181 with hot reload disabled only in test mode. Browser tests exercise 320, 375, 390, 695, 768, 1024 and 1440px, System allowed/reduced, explicit Full under OS reduction, touch swiping, orientation/resize, overflow and local artwork.
- Fresh welcome checks at 390, 768 and 1440px cover both actions, initial Reduced/no implicit persistence, OS explanation, focus wrapping/restoration, reload and route memory. Additional checks cover Escape/dismissal, a new visit and legacy-System migration.
- Orbit checks cover cyclic controls, Home/End/arrows, drag versus click, exposed-cover selection, no navigation while dragging/selecting, stationary working detail link, no moving focus targets, no ongoing automatic article changes, offscreen suspension, orientation/resize and old-rotor cleanup after route navigation. Native vertical CDP touch scroll is verified separately from horizontal selection. Unsupported CSS 3D retains the conventional carousel.
- Scroll checks cover down/up depth reversal, replay after completely leaving a content group, settled opacity, immediate Reduced cleanup, fine-pointer tilt, repository framing/release and normal mobile flow.
- Existing route tours still cover mobile menu Enter/Escape/focus, search/category/type filtering, counts/reset/empty states, valid details/related articles/source notes, unknown slugs, submission required-field focus and fictional validation. No POST or form-text persistence was observed; Admin remains unavailable.
- Unavailable WebGL and actual `WEBGL_lose_context` tests restore the matching SVG on the regular homepage. Deliberate failure tests produce expected Three.js warnings. Hidden-tab suspension/resumption/resource cleanup is verified in lifecycle tests; physical hidden-tab behavior is not claimed.
- The final production preview at `http://127.0.0.1:4173/` was also visually inspected through the in-app browser at 390, 768 and 1440px. An exposed cover selected its actual sample article; cyclic controls and Tab from the composition to the stationary link worked. Temporary viewport overrides were reset afterward.

Final build sizes: main JS **437.56 kB / 143.91 kB gzip**, lazy scene **536.24 kB / 134.42 kB gzip**, CSS **50.53 kB / 10.91 kB gzip**. Vite's existing scene chunk-size advisory remains. These figures are bundle sizes, not network performance measurements. Development frame/pointer diagnostics and the standalone QA fixture remain excluded from production.

## Review

Run `npm ci` if dependencies are absent, then `npm run dev`. To inspect the built app, use `npm run build` and `npm run preview`. Choose **Enable full experience**, or select **Full** in the header. Scroll down and up through the focus/research/repository sections. Drag the covers horizontally, click an exposed cover, or use previous/next and stage arrow/Home/End keys. Follow the separate article link. Select Reduced to compare the conventional carousel and still sculpture.

For a repeatable first-visit review, use a fresh local browser profile/context, or remove only this origin's three preference keys above using DevTools and reload. Do not clear unrelated browser data or change the OS preference. Existing valid Full/Reduced choices intentionally bypass the welcome.

Ignored local review artifacts:

- `.qa/recordings/experience-360-full.webm`: 16.2-second, 1280×800 actual-homepage recording of the fresh dialog, explicit Full, scroll motion, controls and horizontal orbit drag. Playback metadata and sampled frames were inspected. Chromium software rendering/video capture may introduce visible frame loss.
- `.qa/public/experience-welcome.png` and `experience-360-desktop.png`: first-visit dialog and Full composition.
- `.qa/public/experience-production-{390,768,1440}.png`: actual production-preview inspections; keyboard focus may be visible intentionally.
- Existing complete homepage/public-route screenshots and repository recording are regenerated by the suite.

## Remaining limits

Viewport, OS-motion, orientation and touch checks are **browser emulation**. No physical phone/tablet, Safari/iOS, Firefox, screen-reader audit, low-power GPU/thermal/battery test, slow-network benchmark or hosted/deep-link/SEO verification was performed. Network-induced lazy-chunk failure and a forced GSAP module-loading failure were not browser-tested; boundaries and progressive enhancement remain in place. Physical-device profiling is still necessary before release, especially at the higher optional desktop frame cap.

Organization identity, approved articles/covers, team, case metadata, taxonomy, publishing/submission permissions, final visual/motion direction and hosting/SEO remain pending. See [client decisions](client-decisions.md) and [content handoff](content-checklist.md). Sample material must be approved/replaced or deliberately removed/reworked before delivery. This increment stops at the public frontend.
