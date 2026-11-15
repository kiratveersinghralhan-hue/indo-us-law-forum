# Responsive 3D verification — 3 October 2026

Historical record of the earlier responsive increment. The later authorized public frontend pass adds System / Reduced / Full selection, stronger framing and a carousel/repository sequence. Its explicit Full override supersedes this report's earlier OS-override restriction. See [current public frontend verification](public-frontend-verification.md).

## Inspection and change boundary

The existing scene, eligibility queries, responsive styles, tests and previous diagnostic were read before editing. The former `(min-width: 861px) and (hover: hover) and (pointer: fine)` condition and `!reduced` condition prevented scene mounting. Featured parallax shared the desktop gate; entrance reveals used a fixed 14px distance. Offscreen/hidden suspension and init/render/context-loss fallback already existed. No unrelated page, mock content, filter, route or data-provider workflow was changed.

Width and reduced motion no longer prevent loading/mounting Three.js. The hero retains its existing reserved layout. Camera distance fits the rotated geometry bounds to both actual container dimensions, with a motion margin. ResizeObserver and window resizing cover container/orientation changes. The SVG retains its existing ivory panels, copper rules/ring and charcoal spine; it is visible until the first successful draw and on lazy-load/WebGL failure or context loss.

## Current effects and gates

| Effect | Current behavior |
| --- | --- |
| Real WebGL composition | Lazy-loaded at all widths, including reduced motion. Independent hero copy/navigation render immediately. |
| Floating panels | Small, slow float on desktop and touch when motion is allowed; no float under OS or manual reduction. |
| Damped pointer rotation | Hover/fine-pointer devices only, without a width cutoff. Touch pointer events are ignored. |
| Hero scroll depth | GSAP ScrollTrigger at all widths when motion is allowed, from 0 to -0.45 units as the hero passes its `top top` / `bottom top` trigger range. Scrolling before the hero reaches the viewport top does not change depth. |
| Featured visual parallax | At all widths: ±8px up to 860px, ±18px above it. Disabled under reduction. |
| Editorial entrance and selected section reveals | Visible-by-default content; 8px mobile/tablet or 14px desktop translations. No hidden opacity, blocking intro or dependency on WebGL. Disabled under reduction. |
| Homepage featured-card tilt | Retained at ±1.5° for fine/hover pointers only. Touch/coarse devices and reduced motion have no tilt. |
| Reduced-motion real scene | Still real geometry, no continuous RAF loop, scroll tween or pointer listeners; redraw on resize when visible. Manual/OS preference changes cleanly reconfigure the renderer and clear other effects. |
| Pause and cleanup | Rendering stops offscreen/hidden. Route unmount disposes shared geometry/materials/renderer, cancels RAF, kills the depth tween/trigger, and removes custom listeners/observers. Returning Home creates one canvas. |

GPU construction/drawing failure and context loss expose the SVG. A GSAP initialization failure no longer causes an otherwise healthy WebGL scene to fall back. A lazy import/React error is contained by the local scene boundary. Narrow width and reduced motion are not failure conditions.

## Checks performed

Automated Chromium tests load the **regular `/` homepage** through Vite on local port 5181. They do not use `/tests/motion-harness.html` or change OS settings. Browser contexts emulate media preferences, DPR 2 and touch/coarse pointers through 1024px; 1440px uses a desktop fine pointer.

| Width | Motion allowed | Reduced motion |
| --- | --- | --- |
| 320px | Passed | Passed |
| 375px | Passed | Passed |
| 390px | Passed | Passed |
| 695px | Passed | Passed |
| 768px | Passed | Passed |
| 1024px | Passed | Passed |
| 1440px | Passed | Passed |

Each matrix case verifies one ready real canvas, hidden SVG, no horizontal overflow or hero-copy overlap, responsive pixel-ratio cap, the expected frame policy, viewport/orientation resizing on the same page, offscreen suspension and Home → Articles → Home cleanup. Allowed cases check scroll-linked depth; touch cases use native browser touch-event emulation and confirm page scrolling without pointer rotation. Desktop checks confirm damped pointer movement. Reduced cases confirm stable frame counts/depth/rotation and demand redraw after resizing. Normal-path page errors are asserted absent.

Five additional browser checks cover live/manual motion changes, unavailable-WebGL fallback with usable navigation, actual `WEBGL_lose_context` fallback, touch-width featured parallax/section reveals/no card tilt, and desktop card tilt cleared on reduction. Forced WebGL failure/context-loss tests intentionally generate renderer diagnostics.

The first browser run exposed test assumptions: a 100px desktop/tablet scroll had not crossed the hero trigger start, so depth correctly remained zero. The test now scrolls 250px. One test initially captured a blank startup page without a page-error record; adding an explicit homepage-readiness assertion and rerunning the full suite succeeded. These did not justify an application redesign or forced motion.

The in-app browser separately inspected the regular **production preview** at all seven requested widths, with its existing reduced-motion signal. All had one ready real canvas, hidden SVG and no horizontal overflow. The 320px and 695px compositions were visually inspected with normal scrolling. This confirms that the original narrow/reduced preview no longer relies on SVG.

Native Chrome UI testing was attempted with the computer-use skill, but its URL-policy check stopped that attempt before browser input could proceed. No OS preference was changed. The matrix above uses an isolated automated browser instead.

Command results:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 17 lifecycle/preference tests passed; real procedural geometry with a mocked renderer. Includes all-width projection bounds, responsive detail, reduced-mode invalidation, hidden-tab/offscreen handling, disposal and GSAP/GPU failure boundaries.
- `npm run test:browser`: all 19 Chromium homepage checks passed in a complete run.
- `npm run build`: passed; the existing lazy Three.js chunk-size advisory remains (about 536 kB minified / 134 kB gzip).

## Performance and proof limits

Compact mode is selected by viewport ≤768px or container width <300px. It uses a 32-segment ring instead of 64, draws two rules per panel instead of four, caps DPR at 1 and continuous rendering at 24 fps. Intermediate screens cap DPR at 1.25; desktop caps it at 1.5 and 30 fps. Repeated boxes share geometry. No shadows, textures, postprocessing or external models were added. These are implementation limits, not measured hardware benchmarks.

Viewport, touch and orientation checks are **browser emulation**, not physical-device tests. Android/iOS Safari, actual touch inertia/orientation UI, low-power GPU heat/battery/FPS, memory over long sessions, slow-network startup and non-Chromium engines still need physical or separate browser testing. Hidden-tab suspension is covered by mocked document visibility tests; no actual background-tab performance profile was performed. No hosted routing, backend, authentication, publishing or deployment was exercised.

## Reproduce

```sh
npm ci
npm run dev
# One-time browser install, then the isolated regular-homepage matrix:
npx playwright install chromium
npm run test:browser
```

Open the normal homepage, scroll until the hero crosses the viewport top, and continue through the featured sample visual. On a fine-pointer device, move across the sculpture and featured article cards. In browser DevTools, emulate mobile dimensions/touch and `prefers-reduced-motion` explicitly for testing; restore “No emulation” afterward. Under reduction the real composition should remain still. In the normal product the reduction control never overrides an OS reduction request.

Read-only diagnostics on either dev or production preview:

```js
({
  width: innerWidth,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  motion: document.querySelector('.sculpture-stage')?.dataset.motion,
  status: document.querySelector('.sculpture-stage')?.dataset.webglStatus,
  canvases: document.querySelectorAll('.sculpture-stage canvas').length,
})
```

When the hero is visible and WebGL works, expect `status: "ready"` and `canvases: 1` at every width. The dev build also exposes canvas frame count, depth, rotation, detail tier and idle/paused status in `dataset`; these diagnostics are omitted from production. Generated screenshots/traces remain local in ignored `.qa/`.
