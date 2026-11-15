# Indo-US Law Forum — confirmed and pending decisions

Confirmed 10 October 2026: a research wing of student researchers working on India–US cross-border disputes and transactions. It publishes in-house research and accepts contributions from other students. Primary actions: Read articles and Submit an article. Navy/white, black body text on white, white text on navy. Existing editorial layouts, fonts, intro, Full/Reduced motion, publication-cover scene and 360° carousel are retained.

The four exact article categories and stable slugs are centralized in `src/config/research-categories.ts`:

1. Cross Border Insolvency and Restructuring
2. M&A and Foreign Investment Regulation
3. Cross Border Dispute Resolution and Enforcement
4. Regulatory Exposure and Enforcement

Legacy Institutions, Communities and Environment records remain intact and explicitly unmapped. Editors must review each relationship; no automatic correspondence is assumed. Final case taxonomy is pending.

| Pending decision / material | Required before |
| --- | --- |
| Client's own Auth email, agreed editor/admin role and whether temporary developer access should later be removed | Separate client onboarding; developer account must not be renamed/reassigned |
| Submission email accessible to the head of student editors; verified sender/provider | Notification configuration and authorized delivery testing |
| Submission guidelines; whether both PDF and Word are mandatory; Word extensions; per-file/combined limits | Implementing the upload contract and enabling intake |
| Contributor fields, consent, rights, scanning/quarantine and retention | Accepting real identities or originals |
| Manual editor anonymization/email review versus website reviewer workflow | Claiming double-blind review operates; email alone does not establish anonymity |
| Reviewer instructions, conflicts, identity separation and final publishing authority | Operational review and publication approval |
| Notification attachment-versus-link behavior | Changing the prepared reference/admin-link notification; originals stay private |
| Real India–US company dispute example, initial cases, metadata, taxonomy, references and documents/rights | Replacing repository samples or finalizing legal filters |
| Official logo, team identities/roles/portraits/consent, approved articles/authors/citations/dates/artwork | Content sign-off; the current wordmark is typographic, not an official logo |
| Verified contact details, domain, host and rendering/update strategy | Canonicals, sitemap, crawler HTML/social previews and indexing |
| Editor count, permissions and authorized account provisioning | Staff onboarding; no reviewer accounts/assignments/anonymizer are implemented |
| Final motion/intro approval, launch/content-delivery dates and release authority | Launch readiness and separately authorized deployment |
| Analytics provider, visitor-count definition, privacy/consent, retention/deletion | Tracking visitors; analytics currently remains disconnected |

Approval/conversion creates a **draft**; publishing remains explicit. Acceptance and notification status are separate. Originals, identities, emails and private signed URLs stay out of public records, notifications and analytics. Dedicated database/RLS/storage and concurrent conversion checks are now verified as described in [the backend report](dedicated-backend-verification.md); live email and accepted public intake remain unverified and disabled. Deployment, service purchase, production sample import and real email remain outside the current work.

The temporary developer administrator address identifies only the developer test account and is not committed to public documentation. The client email is pending. Submission recipient and public contact must be approved separately and must not inherit an Auth email. See [handover steps](developer-client-handover.md).
