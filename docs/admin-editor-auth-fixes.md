# Article editor and staff authentication — 11 October 2026

This follow-up preserves the public design, covers/3D, connected project `erwliwgbjlutczmtqoss`, routes, staff authorization and existing publication workflows. No schema, migrations, bucket policies, account permissions or passwords were changed. No recovery emails were sent and nothing was deployed. Intake, notification delivery and analytics remain disabled.

## Confirmed causes

The original authenticated Tiptap editor reproduced the reported save message when an empty list item appeared between meaningful paragraphs. Serialization correctly retained the empty bullet, but validation returned a generic error with no block/item location. Tiptap also inserts an empty trailing paragraph; the old serializer retained it and could reject otherwise valid content.

A general Storage failure could not be reproduced with the developer's actual session: a valid PNG uploaded successfully through the original uploader and private policies. The confirmed upload UI defect was that alt text was required by the handler while the input appeared optional; an unexplained disabled upload button obscured that requirement. Selection, failure, partial persistence and save-association feedback also needed improvement. The exact cause of the originally reported unsuccessful file remains unknown; it would be inaccurate to attribute it to RLS or claim a policy repair.

## Completed changes

- Shared content validation reports every affected block/bullet, with actual lengths and limits. The editor marks invalid items and provides explicit Go to item controls plus a linked field summary. Title, slug, excerpt, author, content, upload and general save failures have separate guidance. Drafts can save without an approved author/cover; publishing requires both and checks author approval. Existing database constraints remain authoritative.
- Serialization ignores only empty trailing paragraphs. Empty bullets, entire lists, headings, interior empty blocks and meaningful following paragraphs are retained for correction. A failed save never replaces the current editor state. Server save failures have persistent inline guidance beside the save controls, even after dismissing the bottom toast; duplicate-slug errors identify the slug field.
- Upload shows filename, a fixed-size local preview, a genuine pending state and an in-button spinner. Save/publish and duplicate uploads are disabled during the request. Successful Storage and asset-reference confirmation selects the cover and clearly says the article still needs saving. File selection survives recoverable errors. In-memory attempt tracking reuses the same owned path/reference after interrupted persistence, avoiding duplicate objects on retry. Expiring URLs remain in memory and are stripped from persisted content.
- Safe errors distinguish validation, expired/unverified session, inactive staff access, denied Storage, unavailable bucket/network, reference persistence and private preview failure. Dismissible errors appear bottom-right on desktop and bottom-center on mobile, with inline guidance. Diagnostic logging retains only bounded status/stage and allowlisted codes; it does not retain raw messages, response bodies, credentials, headers or signed URLs. A new upload error replaces any prior form toast rather than stacking two fixed popups.
- Staff sign-in/recovery now uses a navy/white editorial split layout with CSS publication layers, blue depth and brief entrance/line motion. Mobile uses a compact composition above the form. Inputs remain immediately usable. Labels/autocomplete, accessible password visibility, focus states, loading announcements, duplicate-request prevention, retained email and safe inline/toast errors are included. Full/Reduced preferences are respected. Supabase authentication, staff checks and the exact existing recovery redirect remain in place; no signup or social-login placeholder was added.

## Real backend evidence reused

Completed on 10 October using the existing developer-authenticated browser; this resume did not recreate fixtures or repeat remote writes:

- Reproduced the original empty-bullet error, corrected it with the new numbered guidance, and saved a draft with null author while preserving following paragraphs.
- Uploaded a real valid PNG, confirmed the Storage object and metadata/reference, saved the cover, and checked it after refresh. Unsupported SVG was rejected in the actual UI.
- Confirmed anonymous access denied the draft, private cover metadata and Storage download. Publishing without an author was blocked. With clearly labelled disposable author/category fixtures, publishing exposed the article and cover to an independent anonymous client/browser; the image decoded and survived reload. Unpublishing removed anonymous article access again.
- Removed only the recorded test article, author, category, two asset references and two Storage objects. Cleanup proof reports all fixture counts zero; audit events remain. Intake and notification gates were false.

The existing temporary developer administrator identity (stored only in ignored local QA records) was observed confirmed/active (`admin`) during those owner-performed sign-in checks. The agent did not perform activation or inspect/change the password. Earlier inactive/unconfirmed documents are historical snapshots, not instructions to reactivate the account. This identity is separate from the pending client account, notification recipient and public contact.

Ignored local evidence is under `.qa/article-editor`: `remote-fixtures.json`, `private-draft-proof.json`, `public-cover-proof.json`, `cleanup-proof.json`, real public-cover screenshot and responsive upload/auth screenshots. The journal contains fixture IDs/paths, not authentication credentials.

## Focused local verification

- **18 unit tests passed** in `article-editor`, `staff-auth`, `backend-provider` and `backend-boundaries`. They cover empty/valid/overlong bullets, paragraph-only content, trailing-node cleanup, character counts, draft/publication requirements, safe error classification and mocked recovery-password form behavior. The form unit test isolates the unrelated animation hook; motion is checked in Chromium.
- **18 intercepted-HTTP Chromium scenarios passed**: editor/draft layouts at 390/768/1440; ordinary-account denial; private-image renewal with dirty edits; numbered validation and focus; upload pending/denial/retry/file retention, format/size/session failures, partial-reference retry without a second Storage upload; server save/duplicate-slug retry; staff-access revocation; sign-in at 320/768/1440; recovery states/redirect; Full/Reduced motion. These are UI/adapter tests, not new live Auth/RLS/Storage proof.
- After strengthening the inline save guidance, **the two affected failure/retry scenarios passed again**, including simulated save HTTP 503/403/23505, persistent inline errors after toast dismissal, preserved text and eventual one-record save; revoked staff access prevented any Storage POST, showed one toast plus inline guidance, retained the file/edits and succeeded after restored mocked access.
- Lint, TypeScript and browser plus SSR production builds passed. The existing 540.77 kB WebGL chunk warning remains; no new canvas was introduced.

Commands used:

```powershell
npm test -- tests/article-editor.test.ts tests/staff-auth.test.tsx tests/backend-provider.test.ts tests/backend-boundaries.test.ts
npm run test:browser:backend -- --grep "editor fixes|staff auth polish|ordinary account|backend staff UI|private admin preview"
npm run test:browser:backend -- --grep "server save failures|revoked staff access"
npm run lint
npm run typecheck
npm run build:rendered
```

The interrupted run's process output could not be retrieved. The completed results above come from the resumed runs with captured completion output, rather than assumptions based on its artifact alone.

## Remaining limitations and next actions

The original unspecified failing image was not available as a reproducible failure; valid PNG upload and persistence succeeded against the real project. Error/network/revocation/recovery failure branches were simulated without changing remote permissions. The new sign-in success/invalid-credential/loading/recovery presentation was checked with intercepted transport, while real owner authentication was established before the visual update. Real recovery mail delivery/PKCE password-reset completion remains untested because email/password changes were prohibited. Device checks use Chromium emulation, not physical phones or assistive-technology certification.

No further backend change is needed for these fixes. Client onboarding still needs the client's own email and agreed role; keep email/contact purposes separate and leave intake, email delivery and analytics disabled. Production hosting/domain/content approval and deployment remain separate pending work. See the [completion checklist](completion-checklist.md).
