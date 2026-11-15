# Private submission and notification preparation

Local, disabled and unverified against a database/email provider. No real email, scheduler, reviewer accounts/assignments or anonymizer has been created.

## Document policy

Separate disabled PDF and Word controls appear in mock and backend modes. They never read/store originals. Shared `supabase/functions/_shared/submission-policy.ts` gates browser/server intake and notification readiness; remote availability flags cannot override these source gates. Both-required behavior, Word extensions, limits, contributor fields, consent, guidelines, scanning/quarantine and retention await confirmation. Existing PDF-only 5 MiB server/bucket restrictions, MIME/signature checks, streamed-body bounds, CAPTCHA, rate controls, exact origins and private storage remain. This is an existing technical ceiling, not a client-approved limit. Word uploads are **not accepted** by the server yet. Implement/test the approved Word/combined-size contract before removing readiness gates or widening bucket MIME types.

## Acceptance and duplicates

The new local migration adds service-role-only `accept_submission_with_notification`. A transaction advisory lock serializes a request UUID; original gated/validated acceptance and a private outbox insert commit together. SHA-256 fingerprints include normalized email/category, validated content and file bytes. Repeating unchanged details returns the existing reference. Changed content, or historical requests without fingerprints, require reconciliation. Existing submissions are not backfilled/reclassified.

The browser retains request ID/fields for an in-page retry and shows receipt only after server `accepted:true`. Receipt promises neither email nor publication. An ambiguous transport/DB response retains staged files rather than deleting an original that may have been accepted. Trusted orphan cleanup must reconcile unreferenced objects after in-flight requests settle; none is scheduled. Reloading loses the browser request ID; cross-session receipt recovery is not implemented. Contributors should retain confirmed references and contact an editor when uncertain.

## Disabled notification integration

`supabase/functions/.env.example` contains placeholders only: disabled provider, recipient, verified sender, API key, HTTPS website origin and random worker token. Credentials never enter Vite. The optional Resend adapter is preparation, **not a chosen/purchased provider**. Its HTTPS endpoint is fixed. A different provider requires replacing/testing the adapter. References: [Supabase secrets](https://supabase.com/docs/guides/functions/secrets), [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

`submission-notifications` is an unscheduled POST-only worker with no browser CORS. Source readiness, server enable/config validation, a server-only worker token and private DB `notification_settings.enabled=false` keep delivery off. The token is SHA-256 compared before privileged RPCs. Platform JWT validation is disabled specifically for this separate server-token boundary. Verify worker authorization, gateway request limits and trusted scheduling before deployment; never expose worker/service credentials to the browser.

The message contains only a random reference and `/admin/submissions` on the configured HTTPS origin. Existing staff authorization protects the destination. No originals, identities, titles, filenames, attachments or signed URLs are emailed. Attachment-versus-link choice remains pending. Queue `sent` means provider acceptance, not confirmed inbox delivery or review.

The private queue uses leases/`FOR UPDATE SKIP LOCKED`, five maximum attempts, exponential backoff, sanitized error codes and a stable provider idempotency key. Network/timeout, 429 and 5xx failures retry separately from saved submissions. Permanent failures, exhausted attempts or jobs older than six hours become `needs_attention`; trusted staff must reconcile provider state before a manual resend. The short retry window limits deduplication-window risk; exactly-once email/inbox receipt is not guaranteed. Unfinished worker leases expire. Email failure never rolls back an accepted submission or asks the contributor to submit again.

Before independently authorized activation: approve policy/provider/recipient, implement Word validation/scanning, confirm privacy/retention, apply reviewed migrations to a dedicated test stack, execute RLS/storage/idempotency/concurrency/worker authorization tests, test email with an approved sandbox, and verify retry/reconciliation and authenticated links. Only then consider deployment and source/DB gates. Preserve migration history and never publish samples.

## Review boundaries

Originals and identities remain staff-private. Submissions remain separate from articles; approval/conversion produces a draft, publication is explicit. Double-blind review is requested, **not implemented** by notifications. Decide manual editor anonymization/email review versus website reviewers before building accounts, assignments or document anonymization.
