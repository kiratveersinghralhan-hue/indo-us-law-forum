# Author management — 11 October 2026

## Finding and implementation

Read-only inspection of the linked dedicated project `erwliwgbjlutczmtqoss` found **zero authors and zero approved authors**. The existing `public.authors` schema and `/admin/authors` management page already support names, biographies and approval (`published`). This was an empty catalog, not a missing author table.

The article editor now distinguishes loading, an empty approved list, failed requests and an unavailable selected author. It links directly to Authors in a separate tab, offers Refresh authors / Retry authors, and refreshes on returning to the editor. Concurrent return/refresh events share one request. Refresh changes only the list; it does not change the article or select an author automatically.

Authors management now explains approval, labels approved/unapproved entries, confirms saved approval status, reports safe inline/bottom-toast failures, preserves entered details for retry and prevents duplicate saves. Drafts still allow no author; publishing still requires an approved author.

Existing backend enforcement is unchanged: RLS is enabled; only active staff (`editor` or `admin` through `private.is_staff()`) can create/update/approve authors. Anonymous users can read approved authors only. The existing article publication constraints/trigger enforce approved author selection. No schema, policy, permissions or remote data changed in this task.

A failed background snapshot refresh now retains the already-open editor and shows a safe error with Retry records instead of replacing the form. Explicit staff-access denial still closes the workspace; database policies and mutation checks remain authoritative.

## Exact client-content steps

1. **Leave your current article editor open.** Under Approved author, choose **Manage authors (opens in a new tab)**. Alternatively open `http://127.0.0.1:5173/admin/authors` in a separate tab while signed in as authorized staff.
2. Choose **New author**. Enter the client's real **Name** (1–120 characters) and **Biography** (up to 2,000 characters). Do not invent details.
3. If editorial approval is pending, leave **Approved author for publication** unchecked and choose **Save author**. This author will not yet appear in the approved dropdown.
4. When authorized to approve, select **Edit [name]**, check **Approved author for publication**, and choose **Save author**. Confirm **Author saved and approved**. You can also approve during the first save when the details are already approved.
5. Return to the **original article tab**. The approved list refreshes on return; choose **Refresh authors** if necessary. Select the approved name. If loading fails, follow the inline guidance and choose **Retry authors**; do not reload the article tab.
6. Choose **Save draft** to retain the article and its uploaded cover. Drafts can be saved without an author. Choose **Publish approved content** only when the article, author, category and cover meet the existing publication requirements.

Saving an author does not save or publish the article. An author profile is not an Auth account or staff identity and does not grant login access.

## Evidence and limits

- Real backend inspection was **read-only**. No real author or other fixture was created, approved or deleted.
- Focused unit tests: **14 passed** across author error/draft preservation, article validation and backend-provider tests.
- Mocked browser transport checks cover empty/loading/failure/deduplicated retry; creating/editing/approving a mock author in a second tab; authorless draft saving; blocked publication before author selection; selected author/cover association; permission denial and retry. These are UI/provider checks, **not new live RLS or real author-write verification**.
- Related server-save failures and revoked-upload-access regressions use mocked transport. Earlier real upload/publication evidence is reused; no new article/cover fixture was needed.
- **Six focused mocked browser scenarios completed successfully**, including the related regressions above. The screenshot/mobile addition initially hit the default five-second wait while the second tab was still loading; the targeted cross-tab scenario passed on rerun with a 15-second readiness assertion (17.6 seconds total). The Authors page passed a 390px overflow check. Evidence: [empty dropdown](../.qa/authors/empty-dropdown.png), [mobile management](../.qa/authors/mobile-management.png). No physical-device or assistive-technology claim is made.
- During development, hot refresh reset the open unsaved editor. Its captured field values, content and original existing cover reference were restored and compared successfully after removing temporary recovery code. The article remains unsaved. A development-only in-memory hot-refresh safeguard now preserves editor state across these code updates; it is not an autosave or reload-recovery feature.
- Lint, TypeScript, browser production build and SSR production build passed. The pre-existing WebGL chunk size warning remains.
- The pending client action is supplying and entering real approved author details. Real creation/approval and the resulting live article publication remain intentionally unperformed.

Submissions, notification delivery and analytics remain disabled. No emails, deployment or purchases were performed.
