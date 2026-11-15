# Client content handoff

## Confirmed update — 10 October 2026

Indo-US Law Forum: student research on India–US cross-border disputes and transactions, in-house articles and contributions from other students. Navy/white and black body text on white are confirmed. The typographic wordmark awaits an official logo. Read articles and Submit an article are the primary actions. Four exact article categories/stable slugs live in `src/config/research-categories.ts`. Legacy categories/relationships remain unmapped and require explicit editorial review. Four additional fictional outline templates demonstrate the confirmed filters without legal findings. Historical sample identifiers below are retained.

Supply submission email/guidelines, PDF/Word requiredness/extensions/limits, contributor fields/consent, anonymization-versus-website-review choice and publishing authority. Originals/identities stay private; email alone does not implement double-blind review. Supply a real India–US dispute case example before defining final repository metadata/taxonomy/collection/documents. Also supply logo, team/articles/contact/domain, editor count/permissions, final motion approval, launch/content-delivery dates and analytics/privacy/retention. Visitor statistics are the analytics priority; no traffic is measured. `client-decisions.md` is the current decision register; pending identity/taxonomy wording below describes the historical placeholders, not current confirmed decisions.

Every public record currently shown is a fictional sample. This checklist is a replacement map, not permission to publish placeholders. Before client delivery, replace samples with approved real content, or deliberately remove/rework the corresponding section. Review each route and link afterward. Do not add a blanket production flag that hides genuine missing content.

## Identity and shared copy

| Placeholder / location | Editable source | Client material needed |
| --- | --- | --- |
| Indo-US Law Forum, subtitle and sample notice | `src/config/brand.ts` | Official logo and verified contact details; keep sample notices until approved content replaces samples |
| Hero headline, introduction and publication covers | `src/config/site-copy.ts` → `hero` defaults; local `/admin/settings` for demo headline/introduction | Confirm final motion and approved article/cover content; organization purpose and primary actions are implemented |
| Four numbered research areas | `site-copy.ts` → `focus`; `research-categories.ts` | Exact names/order confirmed; review legacy record mappings explicitly |
| Featured and supporting-reading copy | `site-copy.ts` → `featured`, `supporting` | Editorial selection policy, homepage selection and approved introduction |
| Repository introduction and two narrative chapters | `site-copy.ts` → `repository` | Approved archive purpose and explanatory copy; confirm whether the two-part sequence fits the institution |
| Team/contribution/homepage invitation | `site-copy.ts` → `teamPreview`, `contribution` | Real team introduction and approved contribution invitation |
| Team, Articles, Cases and Submit introductions | `site-copy.ts` → matching keys | Approved page descriptions, editorial standards and contribution guidelines |
| Footer description and statements | `site-copy.ts` → `footer` | Organization summary and verified contact/legal details, if required |
| Experience welcome copy and 360° cover treatment | `site-copy.ts` → `welcome`, existing featured records/artwork; `motion.ts` | Approve the optional motion wording and provisional cover composition; no extra article records or identities are required |
| Navy/white, licensed typography and publication covers | `src/public-design.css`, `src/styles.css`, `src/config/motion.ts` | Final motion/intro approval; preserve Full/Reduced and failure/static fallbacks |
| Browser title, favicon and indexing policy | `src/config/brand.ts`, `index.html`, `public/favicon.svg`, route title handling | Approved mark, metadata, canonical domain, social imagery and hosting/SEO decision; keep prototype noindex until ready |

## Original local visual placeholders

Assets are bundled, original SVG studies with no external model/photo dependency. They may remain only with client approval; otherwise replace them in `src/config/media.ts`, including truthful alt text and captions. Update dimensions/aspect ratios deliberately when replacing assets. Keep rights/attribution records for any supplied third-party image.

| Asset key | Current use | Required replacement/approval |
| --- | --- | --- |
| `institutions` | First featured article, listing/detail | Approved institutional/editorial artwork or relevant licensed image |
| `communities` | Library/listening articles and contribution panel | Approved research/community imagery or approval to retain the abstract arches |
| `environment` | Shade article | Appropriate environmental research artwork or licensed imagery |
| `archive` | Records article, repository sequence, case detail pages | Archive/source imagery or approval to retain abstract sheets |
| `avatar` | Three team placeholders and homepage team preview | Actual approved portraits with permission, or a deliberate nonportrait team treatment; never label stock people as the real team |
| Procedural publication covers + CSS static fallback | Hero | Final motion approval and approved article covers; no organization claims are encoded in artwork |

## Fictional records

Baseline public entries live in `src/data/mock-data.ts`; `src/admin/seed.ts` adds one draft article, one draft case and two fictional submissions. Local demo changes live in the namespaced store; components use typed providers only. Demo edits are not an approved content handoff or production import. For each approved article, supply title, slug, abstract, complete body, category, author attribution, publication date, citations, image/rights/alt text and whether it is featured. Reading duration must be calculated from approved content or omitted. The carousel currently contains the first three featured samples and links to their real local sample routes.

| Sample article slug | Current placeholder |
| --- | --- |
| `reading-the-spaces-between-decisions` | Reading the spaces between public decisions |
| `a-library-as-a-shared-space` | A library as a shared space |
| `mapping-neighbourhood-shade` | Mapping neighbourhood shade |
| `the-language-of-public-records` | The language of public records |
| `listening-before-measuring` | Listening before measuring |

For each case, supply an approved title/slug/reference, summary, record type, category, setting/jurisdiction, dates, tags, body, verified sources and any supporting-document links/rights. Current source notes explicitly state that documents were not supplied; no download or source evidence is fabricated.

| Sample case slug | Current reference |
| --- | --- |
| `shared-library-pilot` | SAMPLE–001 |
| `local-records-review` | SAMPLE–002 |
| `street-shade-observation` | SAMPLE–003 |
| `community-noticeboard` | SAMPLE–004 |

| Other fixtures | Client material needed |
| --- | --- |
| Institutions / Communities / Environment | Explicit legacy mapping review; no records/IDs are deleted or guessed into new categories |
| Four `sample-<confirmed-category-slug>` article outlines | Approved research, sources and attribution; templates assert no legal findings |
| Sample profile A / B / C | Approved names, roles, biographies, portraits and consent; no present sample role implies a real appointment |
| Shared structured article/case body templates | Actual research, limitations, citations and editorial format; samples contain no verified findings |

## Editorial and release decisions

- Approve all public copy/media and record links individually; retain only verified identities, dates and claims. No fake statistics, testimonials or logos should be introduced.
- Confirm submission workflow, consent/retention and PDF/Word requirements before intake. Mock text validation and separate disabled upload controls send nothing. Backend auth, private originals and draft conversion are prepared but database/RLS/storage remain unverified. The server notification integration is prepared, disabled and has sent no real email.
- Decide domain, host, deep-link routing, indexing/share-preview requirements and content-related legal wording. No hosting or production publishing is performed here.
- Recheck desktop/mobile layouts, keyboard navigation, image loading, filters, unknown slugs, motion modes and reduced-motion behavior after real content replaces the samples.

## Local admin placeholders

| Editable demo material | Client material/decision required |
| --- | --- |
| Hero, four confirmed areas plus retained unmapped legacy categories, contact/social fields | Approved publication content and verified contacts; explicitly review legacy mappings; leave unknown contacts absent |
| Section visibility/order and featured articles/cases | Confirm editorial homepage selection and order; remove/rework empty sections deliberately |
| Draft article/case seed and two submission samples | Remove demo records before any production import; approve real editorial intake/review requirements |
| Team edits and local image previews | Verified profiles/consent and approved image assets; previews are not uploaded or a durable content handoff |
| Case document labels | Actual approved documents, sources, rights and future upload/access policy; placeholders are not downloads |
| Recent activity / analytics-not-connected | Visitor counts are the priority. Select provider/privacy/retention; editorial counts/activity are not measured traffic |
| Structured blocks | Confirm required editorial formats and citations before any richer editor/backend implementation |
