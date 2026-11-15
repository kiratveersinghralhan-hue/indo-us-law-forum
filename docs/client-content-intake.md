# Approved content intake

Confirmed identity: Indo-US Law Forum, student research on India–US disputes/transactions, navy/white and the four exact article categories in `src/config/research-categories.ts`. Legacy mappings still require explicit review. The table below requests final material, not reconfirmation of those decisions. Visitor statistics are the main analytics priority. Separate PDF/Word policy, head-of-student-editors email, double-blind workflow and all privacy/security checks are pending; intake and notification delivery remain disabled. See `client-decisions.md` and `submission-delivery-preparation.md`.

Provide written approval and replacement material in this single checklist. Keep passwords, Auth tokens and API keys out of content files.

| Material | Where it is used | Required client input |
| --- | --- | --- |
| Organization identity | Header, intro, footer, document titles, social previews | Approved name, descriptor, logo files/usage rights, colors/type approval |
| Homepage/editorial copy | Hero, existing focus/research/repository/team/contribution sections | Final copy and deliberate keep/remove decisions for incomplete sections |
| Contact/social | Footer/settings | Public email/address/links; consent to publication |
| Team | Public directory | Approved names, roles, bios, profile artwork/photos, image rights/alt text, links, order; these do not grant staff access |
| Taxonomy | Focus areas, article/case filters | Category names/descriptions, mapping of every article/case |
| Authors/articles | Reading room and 360° research covers | Author names/bios, titles/slugs, summaries, structured body, approved covers/alt text, dates, attribution/rights, featured/order choices |
| Cases | Repository/details | Agreed metadata/schema, references, summary/body, tags/dates/sources; supporting PDFs with rights and explicit public/private status |
| Submission intake | Public contribution form/private reviews | Privacy/contact consent copy, retention policy, attachment rules and reviewer workflow |
| Staff/publishing | Auth and authorization | Named account owners, provisioning approver, who may publish/delete/review/settings; staff identities are handled out of band |
| Domain/hosting | Canonicals, recovery links, deploy configuration | Domain approval/ownership, hosting/SEO/update decision and explicit deployment authorization |
| Analytics | Disconnected dashboard area | Whether needed, provider/account, metrics and consent requirements |

## Repeatable reviewed import/update

`docs/content-import.example.json` is an empty structural template, not approved content. Use stable UUIDs, written approval reference/date and explicit operations: `{ "intent": "create", "record": {...} }` or `{ "intent": "update", "expectedUpdatedAt": "ISO timestamp from the existing record", "record": {...} }`.

Catalog records contain `id`, `label`, `description`; imports create them private. Article/case/team records match the typed admin models, **must** have `fictional:false` and `status:"draft"`. Article records require `authorId`, `categoryId`, `coverAssetId`, canonical lowercase `slug`, title, summary, supported `body`, `order`, reading time and display date. Team records require approved label/role/bio, links/order and `coverAssetId`. Cases use existing fields plus reviewed metadata where required. Upload approved assets first; map their actual asset UUIDs. Never guess IDs, include file credentials or assume a slug maps to the correct author/category.

1. `node scripts/content-tool.mjs validate PATH_TO_APPROVED_MANIFEST.json` checks required fields, duplicates, unsafe links, forbidden credentials, placeholders and draft-only behavior.
2. Populate process-only `CONTENT_SUPABASE_URL`, `CONTENT_PUBLISHABLE_KEY`, `CONTENT_STAFF_ACCESS_TOKEN` from a staff session through secure local entry. Do not paste tokens into chat or put them in manifests/Vite variables. Never use service keys for content imports.
3. `node scripts/content-tool.mjs import PATH.json` performs a read-only preflight/dry run. Local origins are allowed; future authorized remote use additionally requires `--allow-remote`. It checks existing IDs/slugs and category/author/asset mappings before any writes.
4. Review the plan, then add `--apply` only in the authorized environment. No upserts, implicit overwrites or automatic publication. Updating an existing published article requires an intentional unpublish in admin first. Every update checks its supplied revision; conflicting records stop the import.
5. Keep the printed ID/revision receipt. Imports save one record at a time; a later failure may leave earlier drafts saved. Re-export/review those records and use explicit revisions before retrying; do not replay a failed file blindly. Repeated creates are flagged, not overwritten or duplicated. Review and publish individual approved items in admin.
6. Export a content snapshot including `authors`, `settings.categories`, assets and approved `branding` (`name`, `canonicalOrigin`, `shareImage`). Run `node scripts/content-tool.mjs prelaunch PATH_TO_SNAPSHOT.json`. It flags demo records, provisional branding/settings, missing images/documents, broken taxonomy/featured references and absent published research. This offline record check does not fetch assets or prove URL availability; verify actual uploads/URLs separately.

Final copy/media replacement includes `src/config/brand.ts`, `site-copy.ts` and shared artwork where deliberately retained. There is no blanket production switch to conceal genuine unresolved material. Replace it with approved content or deliberately remove/rework its section, then rerun prelaunch.
