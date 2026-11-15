# Intro and local admin verification — 3 October 2026

Both increments were completed sequentially. The public layouts, native scrolling, hero WebGL scene, Full CSS 3D carousel, motion preferences, public filters and validation-only submission form are retained. This report supersedes earlier reports for admin availability and intro behavior; earlier performance observations are historical, not fresh device benchmarks.

## Increment 1 — verified before admin work

- Lint, strict type checking, production build and the existing 26 unit tests passed before starting Increment 2.
- 12 focused Chromium browser checks passed for welcome/intro and preference sequencing.
- Full choice retains the welcome during its 300 ms exit, removes it/restores focus, then plays the provisional label/fine-line/type intro for 1.35 seconds. No simultaneous overlays were observed.
- Skip/Enter and Escape finish the intro; natural completion, reload/session memory, navigation during intro and focus restoration were checked at 390 and 1440 px.
- Reduced/Calm and dismissal skip the animated intro and leave navigation/native scrolling usable. Full remains an explicit visitor choice, including when the system requests Reduced. System still follows the OS preference.
- The in-memory intro guard was checked when sessionStorage reads work but writes fail: mode changes and returning to Home do not repeat the intro within the running app. Reload/session persistence still requires writable browser storage.
- A deliberately unavailable WebGL context did not delay intro completion or remove hero content/navigation. Route changes remove the intro and clean its timers/listener. There is no body scroll lock.

## Increment 2 — local workflows checked

The full regression suite passed **60 browser tests**. Three additional checks were subsequently added. The final **13-test admin suite** passed after the last admin form/focus changes, and the **6-test intro suite** passed after hardening the memory guard for readable-but-unwritable session storage: **63 distinct browser checks** have been executed successfully across those runs. The final suite now contains 63 tests; a single all-63 run was not performed. Final lint has no warnings/errors, **38 unit tests** pass, and strict type checking/production build pass.

| Workflow | Evidence actually checked |
| --- | --- |
| Dashboard | Counts from actual seed/mutated records: initially 1 draft article, 5 published articles, 2 pending submissions and 5 cases including a draft; recent actual local activity; Analytics not connected |
| Articles | Create draft, not-found publicly while draft, publish, edit, public-tab reflection, unpublish, list/search/status filter, delete cancellation/Escape/focus restore and confirmed deletion |
| Validation/content/media | Required-field focus, invalid/duplicate slug errors, safely escaped script-like text in structured preview, temporary local image preview/clear, no persisted blob URL/filename or upload request |
| Submissions | Approval required for conversion, rejection, one draft per approved source, disabled repeat conversion after reload, no automatic publication; repeated concurrent calls in one JS environment and deletion-ledger behavior covered by unit tests |
| Cases | Create/edit/draft/publish/unpublish/delete; provisional setting/tags; supporting-document labels explicitly not uploaded; public-tab reflection |
| Case typing | Keystrokes with commas/spaces and new lines remain intact while editing; tags/document labels normalize only on save |
| Team | Add/edit/remove fictional neutral profiles, safe example link, accessible up/down reorder and public-page order/links; unsafe/credential-bearing URLs rejected in unit tests |
| Homepage settings | Hero/focus/contact/social edits, featured article/case order and selections, existing section DOM order/visibility, public reflection and reset |
| Unsaved edits | Internal navigation and browser back require discard/cancel; native beforeunload warns on dirty reload, cancellation retains input, successful save removes the warning |
| Reset | Confirmed reset/cancel, original records/copy restored, current editor cleared and motion preference retained |
| Error boundaries | Invalid existing store fails without fixture fallback; retry/confirmed reset recovery; blocked reads/writes stay visible with usable chrome; failed save retains unsaved input and never reports success |
| Provider isolation | Cloned reads, published-only public projections, admin fields omitted from public records, namespaced persistence, sequential separate-environment edits and no production mock fallback |

The reload cancellation test asserts the native beforeunload dialog and retained form state. Chromium may leave Playwright's cancelled navigation waiting instead of returning an abort; the harness bounds that wait. This was a test expectation correction, not a change to browser security or reload behavior.

## Browser and production-preview evidence

- Isolated Chromium exercised the regular homepage at **320, 375, 390, 695, 768, 1024 and 1440 px**, in allowed/reduced policies. Existing tests also cover Full selection, pointer/drag/click distinction, touch scrolling, orientation/resize, down/up scrolling, keyboard controls, unavailable WebGL/context loss and route cleanup.
- Admin workflows ran at 1440 px, with keyboard/add/save/overflow checks at **320, 390 and 768 px**, followed by landscape resizing. These are viewport/touch emulation, not physical phones/tablets.
- The built `4173` preview was reviewed through the in-app browser at desktop/mobile sizes. A separate isolated production-bundle smoke check verified fresh Full welcome → intro → orbit, article draft/publish/public reflection/reset, 390/768 px framing, and no unexpected page errors. Temporary viewport overrides were reset.
- Intentional WebGL-failure tests emitted expected Three.js initialization errors; their matching SVG/content/navigation fallback checks passed. The local workflow test observed no non-GET requests. No backend/provider integration was invoked.
- Ignored `.qa/admin/` contains built intro/dashboard screenshots and responsive admin screenshots. The existing video capture regenerated `.qa/recordings/experience-360-full.webm` with the current welcome/intro and Full scroll/orbit experience. These artifacts are local QA output, not published media.

## Review locally

Run `npm ci` if needed, then `npm run dev`; open the printed localhost URL. `/admin` is openly accessible and explicitly labelled local demo. Use fictional content only. Save a draft, publish it to the local demo, open its public slug, unpublish it, then use confirmed Reset demo data to restore samples. Already-open tabs on the same origin reflect saved demo records. Different localhost ports have independent stores.

Use a fresh browser session/private window to review the experience dialog; choose Full for the intro and 3D carousel, or Calm to skip animation. Reloading in the same session intentionally does not repeat the intro. A saved Full visitor receives the intro once when entering the homepage in a new session. The header Motion control remains available.

## Limits and backend requirements

- No Supabase, database/schema changes, authentication/authorization, uploads, email/submission delivery, live analytics, deployment, domain purchase, commit or push were performed. Admin URLs/provider filtering are not security controls.
- LocalStorage is untrusted and is not a shared CMS, durable backup or atomic multi-user database. Simultaneous cross-tab writes can overwrite edits; open editors preserve their own unsaved state. Reload an editor to receive external edits. Future backend writes need authorization, concurrency/uniqueness guarantees and atomic submission conversion.
- Persisted records must remain fictional. The confirmation checkbox cannot establish whether a real person or research claim is genuine. Production needs explicitly configured providers and approved real content; a production failure must never load demo records.
- Bundled covers/neutral avatars are saved; selected images are temporary local previews only. Supporting documents remain labels. Cases use the provisional three-category taxonomy, which still needs client confirmation. Rich editorial formats beyond the supported block union require a later decision.
- Vite still reports the >500 kB chunk advisory for the main bundle (about 511 kB minified / 166 kB gzip) and lazy Three.js bundle (536 kB / 134 kB gzip). Admin UI is a separate lazy chunk of about 30 kB / 9 kB gzip. These sizes are not a guarantee of performance. No fresh GPU/battery/frame-time benchmark was conducted in this increment.
- Physical iOS/Android devices, Safari/Firefox, assistive-technology users and low-power GPU/thermal performance remain untested. Hosted deep links, SEO, real uploads/submissions, auth and backend concurrency remain future integration work.
