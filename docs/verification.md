# Verification — 3 October 2026

> This records the initial foundation/motion increment. Later responsive 3D and public frontend updates supersede the static mobile/reduced-motion behavior and old test counts below. See [current public frontend verification](public-frontend-verification.md).

## Initial inspection

The workspace contained only an empty `.git` repository: no commits, tracked files, existing package/source/configuration or unrelated changes. No applicable `AGENTS.md` was found in the workspace or its ancestor directories. The approved Lovable demo was inspected in a browser for typography, spacing, palette and editorial hierarchy. No proprietary source or portfolio source was accessed.

## Commands executed

- `npm run lint` — passed with no errors or warnings.
- `npm run typecheck` — passed; production builds also run this strict check, including the test sources.
- `npm test` — 7/7 passed across two files.
- `npm run build` — passed. Vite reports a size advisory for the lazy Three.js chunk: 534.27 kB minified / 133.68 kB gzip. Initial application JS: 412.20 kB / 138.39 kB gzip; CSS: 28.71 kB / 6.80 kB gzip. These are bundle sizes, not measured download timings.
- Production bundle inspection — no QA harness, QA controls or development-only frame diagnostics in `dist/`. Only the mock provider imports the fixture module. No runtime network API, browser persistence, injected HTML, Supabase SDK or credentials were added.

The foundation was checked before the motion pass, then lint, tests, type checking and build were repeated for the final implementation. Node 24.19.0 and npm 11.19.0 were used. Nothing was committed, pushed, purchased or deployed.

## Browser checks actually performed

Local Vite development and production-preview servers were checked in the Codex in-app browser. Desktop checks used 1440 × 1000 and 980 × 900; mobile checks used 390 × 844 and 320 × 740. No horizontal overflow was detected in the checked homepage, case detail and form states.

- Desktop links and mobile disclosure navigation work. Keyboard Enter opens the menu and activates links. Escape closes it and restores toggle focus. The skip link moves focus to main content, and route changes focus main content.
- Article category filtering narrows the samples. Valid article slugs resolve; unknown article slugs display article not-found.
- Case search works, including uppercase text, category/type combinations, empty results and reset. Valid case slugs resolve; unknown case slugs and unknown page URLs display the appropriate not-found view.
- Team profiles are labelled placeholders; Admin is visibly unavailable.
- Empty and whitespace-only form values produce required-field errors and focus the first invalid field. Fictional populated fields produce the unavailable-prototype message, with no successful-submission state. Production-preview validation was checked at narrow mobile width.
- The browser requests reduced motion: the regular app displays the static composition with no canvas. The reduction control cannot override this preference.
- A separate development HTML fixture emulates no-preference. In that fixture, the real WebGL sculpture renders, pointer damping changes its small rotation, selected card tilt reaches about 1.3 degrees, the featured visual has a scroll-linked transform, and sculpture depth changes with gradual hero scrolling.
- Offscreen frame count stops and resumes when the hero returns into view. Route navigation removes canvas/scene hosts; returning Home creates one canvas. Manual motion reduction removes the canvas and clears parallax/card transforms.
- A real `WEBGL_lose_context` event returns to the static SVG. Simulated unavailable WebGL leaves the SVG, text and navigation usable. At mobile width, even the no-preference fixture uses static artwork with no canvas; ordinary page scrolling remains available.
- The production preview reported no browser warnings/errors in the checked navigation and validation flows. Development HMR produced an earlier transient stylesheet-reload error during edits; forced unavailable-WebGL QA intentionally produces Three.js initialization diagnostics. These were not treated as production runtime failures.

## Automated test boundaries

Lifecycle tests use a mocked renderer and real Three.js geometry. They verify ratio capping, frame throttling, pause/resume offscreen and on document visibility changes, resource/observer/tween cleanup, context-loss recovery, initialization failure and render failure. Preference tests verify static mobile behavior, OS reduction, live media changes, manual reduction and subscription cleanup. They do not measure a GPU or prove cross-browser compatibility.

## Remaining limits

No physical mobile/touch device, low-power GPU, slow-network, memory/long-session profiling or multi-browser test was performed. Hidden-tab handling is covered by automated visibility tests; an actual background-tab performance profile was not performed. Hosted deep links, HTTP statuses, indexing, metadata previews and deployment routing remain unverified and unresolved. No backend/provider integration, publishing, submission, authentication or permission behavior exists to validate in this increment.

Review final branding/content and the client decisions before further work. This is a verified local frontend prototype, not a production release.
