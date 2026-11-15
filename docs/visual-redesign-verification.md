# Public visual redesign — 7 October 2026

The final palette follows the user's selected direction: forest green (`#123b30`), warm ivory (`#fcf8ef`) and burnt orange (`#b44627`). It replaces the earlier navy/cobalt proposal. This is a local visual change; nothing was deployed, committed or pushed.

## Presentation

- A stronger, compact hero hierarchy uses locally hosted Source Serif 4 and Public Sans. Both font licenses are bundled under `public/fonts/`. The existing editable headline and introduction remain connected to public site settings.
- The existing single WebGL scene now renders up to three dimensional publication volumes with original local artwork. Damped pointer movement changes perspective; selection brings a cover forward. Native scrolling makes the composition recede and fan slightly.
- Visible buttons work with keyboard and touch. The selected article's title, sample label and reading link remain stationary below the scene. The existing 360° research carousel retains full rotation; the hero emphasizes depth and selection.
- Reduced mode renders still WebGL, redraws on selection/resize and has no continuous motion. Unavailable WebGL and context loss restore the matching CSS cover composition. Offscreen/hidden rendering pauses, and unmount disposes scene resources, textures and listeners.
- Focus areas now use image-led compositions. Featured research has a contrasting reading surface and substantial supporting imagery. The archive uses forest green; the contribution section uses burnt orange. The public collections, details, team, submission, intro, dialog, header and footer share the palette and typography.
- Local illustrations depict architecture, shared spaces, topography and archival pages. They are editorial studies, not documentary photographs. Fictional/sample labels remain visible.

## Preserved boundaries

No edits were made to the routes, providers, backend implementation, admin workflows, Supabase files or database schemas. No migrations, provider operations or deployment were performed. The admin retains its functional forms, validation and editing controls, with simple neutral presentation.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` | Passed on final files |
| `npm run typecheck` | Passed; also runs as part of build |
| `npm test` | 52 unit tests passed |
| `npm run build` | Passed with the existing large lazy WebGL chunk advisory |
| Existing browser suite | 63 checks passed on the first run; its recording check timed out |
| Recording recovery and new publication checks | All 8 passed after shortening the recording's paced scroll sequence; selection tests cover 390, 768 and 1440px in Full/Reduced plus unavailable WebGL |
| Backend UI regression suite | 5 passed using intercepted HTTP responses |
| Production build visual capture | 15 public route/viewport combinations captured at 390, 768 and 1440px; no page errors or horizontal overflow |

There are 71 unique regular browser checks plus 5 backend UI checks across the suite and targeted reruns. The existing regular suite covers 320, 375, 390, 695, 768, 1024 and 1440px, native touch scrolling, carousel keyboard/touch/drag controls, preference persistence, context loss, route cleanup, public filtering/detail pages and admin workflows. The final palette was checked with the targeted interaction tests and all 15 production-build captures; the complete suite was not repeated solely for color changes.

The recording originally used many small wheel commands, exceeding its timeout when browser capture ran concurrently. Its final sequence covers the same sections and interactions using fewer paced wheel commands; it passed in 12.3 seconds. Separate production-build capture also completed successfully.

## Artifacts

All captures are local and ignored by Git under `.qa/redesign/`:

- `home-desktop-full.png` — final homepage hero with Full mode.
- `home-desktop-reduced.png`, `home-tablet-reduced.png`, `home-mobile-reduced.png` — complete final homepage layouts.
- `articles-*`, `cases-*`, `team-*`, `submit-*` — final public-page layouts.
- `motion-dialog-desktop.png`, `intro-desktop.png`, `carousel-desktop-full.png`, `repository-desktop-full.png`.
- `homepage-interaction.webm` — short production-build recording of the preference choice, hero pointer movement, cover selection, native scrolling and carousel controls.
- `capture-checks.json` — responsive route/overflow/error results.

To regenerate captures, serve the build at `http://127.0.0.1:5173` and run `node scripts/capture-redesign.mjs`.

## Remaining limits

Browser evidence is Chromium on this Windows machine with emulated touch and viewport sizes. Physical mobile performance, Safari and Firefox were not tested. The lazy WebGL chunk remains approximately 541 kB minified (136 kB gzip). Mocked backend checks do not establish live Auth, database/RLS, storage or deployment security. Branding, sample records and neutral team identities remain provisional as before.
