# Motion diagnostic — 3 October 2026

> Historical inspection before the subsequent all-viewport and public frontend requests. The width/reduction gates and earlier OS-override restriction described below have now been replaced. See [current behavior and browser verification](public-frontend-verification.md). Preserve this report as evidence of why the original preview was static, not as instructions for the updated application.

The running homepage at `http://127.0.0.1:4173/` was inspected before any edits. No rendering or initialization bug was reproduced. Application source, motion amplitudes, layout and reduced-motion behavior have been left unchanged.

## Why the current preview is static

The inspected in-app page was 695 × 668 CSS pixels. It reported `prefers-reduced-motion: reduce`, displayed the disabled “System: reduced motion” control, and did not match the existing desktop condition `(min-width: 861px) and (hover: hover) and (pointer: fine)`.

There were zero canvases and zero WebGL hosts. The SVG fallback had opacity 1, the stage had `data-static="true"`, and the featured visual had no GSAP inline transform. The browser console had no warnings/errors. These are intentional preference/responsive gates: the lazy scene was not mounted and the scroll/pointer effects did not initialize. This is not evidence of a WebGL failure.

The CSS signal does not identify whether reduction originates in OS accessibility settings or browser emulation. Neither was changed. A narrow desktop browser panel also independently fails the width condition.

The production entry and lazy scene asset both return HTTP 200. The served scene asset is JavaScript and its SHA-256 matches the local build. No missing or stale scene asset was found.

## Eligible desktop path checked

The existing development-only `/tests/motion-harness.html` was used at 1100 × 900. That separate fixture emulates no-preference; it does not change the normal app or OS settings. It is not part of the production build.

| Effect | Result and existing limits |
| --- | --- |
| Lazy Three.js scene | Loads and renders one canvas; stage reaches `data-webgl="ready"` and SVG opacity becomes 0. No console errors. |
| Continuous floating | Rendering advances while the hero is visible. The existing procedural panel update uses a 0.045-unit float amplitude and a roughly 12.6-second cycle. |
| Pointer rotation | Native pointer input changes damped rotation; observed from `-0.090,-0.220` to approximately `-0.123,-0.182` radians. Maximum configured pointer offset is about 3.15° per axis. |
| Hero ScrollTrigger depth | Gradual scroll changes rendered depth from `0.000` to `-0.073` at about 247px scroll. Full configured offset is -0.45 scene units. |
| Featured visual parallax | Inline translation changes from -18px to approximately -7px as the visual enters view. Full range is -18px to +18px, restricted to eligible desktop/fine-pointer visitors. |
| Homepage featured-card tilt | Native pointer input produces perspective and rotation transforms. Maximum configured tilt is 1.5° per axis; ordinary article-list cards are not wired for tilt. |
| Editorial entrance | Existing reveal is a short 14px translation over 0.65 seconds, with a small stagger. It leaves content visible and does not wait for the scene; it is not a full-screen intro. |
| Pause and route cleanup | Offscreen frame count stops. Navigating to Articles removes the canvas and host; returning Home creates one ready canvas. Automated tests cover hidden-tab and preference-change cleanup. |

The movement is intentionally restrained. Small amplitudes, low-contrast ivory panels and substantial whitespace make depth/motion easy to miss even on the eligible path. These visual choices have not been amplified or redesigned while final direction is pending.

## Verify in your browser

Open the normal preview in a full desktop Chrome/Edge window with a mouse, with the page viewport wider than 860 CSS pixels. Docked DevTools or the in-app side panel can shrink the viewport below the threshold. In DevTools Console, inspect:

```js
({
  width: innerWidth,
  reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
  desktop: matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine)').matches,
  canvas: document.querySelectorAll('.sculpture-stage canvas').length,
  ready: document.querySelector('.sculpture-stage')?.dataset.webgl,
})
```

When `reduced` is false and `desktop` is true, wait for `canvas: 1` and `ready: "ready"`. Move the pointer across the sculpture, scroll slowly while part of the hero remains visible, continue through the featured sample visual, and hover near the edges of the homepage's featured article cards. Reload to see the brief entrance again.

When `reduced` is true, the static composition is the expected result. Keep that preference if it is intentional. Chrome/Edge's Rendering panel can reveal an active media override; “No emulation” follows the normal browser/OS preference. For an explicit local motion test without changing OS settings, the existing separate development fixture can be used in a wide viewport. Its URL rewrites to `/` after loading, so a hard reload returns to the normal app.

References: [Chrome Rendering media emulation](https://developer.chrome.com/docs/devtools/rendering/emulate-css), [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).

Current lint, strict type checking and all 7 automated tests pass. Production build passes with the existing advisory for the approximately 534 kB minified / 134 kB gzip lazy Three.js chunk. Physical-device performance and other browser engines remain unverified.
