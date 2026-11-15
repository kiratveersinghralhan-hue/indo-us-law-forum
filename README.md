# The Corridor — India-US Cross Border Law

**Architectural Editorial Platform — India–US Cross-Border Legal Research & Publishing**

**The Corridor** (*India-US Cross Border Law*) is a legal research and publishing platform focused on India–US cross-border disputes, insolvency, M&A/foreign investment regulation, and regulatory enforcement.

The frontend implements the **Architectural Editorial (The Stele V2 / The Corridor)** design direction: a disciplined navy, muted slate-blue, and crisp white editorial aesthetic paired with locally hosted **Source Serif 4** and **Public Sans** typography, a skippable ~2.05-second opening sequence, a single-canvas 3D publication sculpture with automatic static SVG/CSS fallback, a 360-degree interactive `ResearchCarousel`, and a selectively glassmorphic staff administration workspace.

---

## Key Capabilities

### Public Editorial Experience
- **Homepage (`/`)**: Hero publication stage with interactive cover selection, 3D WebGL publication sculpture (`Three.js` lazy-loaded only in Full motion mode) with static fallback, 360-degree orbital research carousel, confirmed four-category research taxonomy, case repository preview, and institutional overview.
- **Confirmed Research Taxonomy**:
  1. `Cross Border Insolvency and Restructuring`
  2. `M&A and Foreign Investment Regulation`
  3. `Cross Border Dispute Resolution and Enforcement`
  4. `Regulatory Exposure and Enforcement`
- **Articles (`/articles`, `/articles/:slug`)**: Searchable, category-filterable research index and structured long-form article reader with reading progress indicator, lead paragraphs, pull quotes, callouts, and lists.
- **Case Repository (`/cases`, `/cases/:slug`)**: Filterable cross-border case summaries with structured metadata and public PDF document access where approved.
- **Team (`/team`)**: Editorial board and student researcher directory (explicitly marks pending client biographies/portraits without fabricating identities).
- **Submissions (`/submit`)**: Contributor submission portal with client-side validation and explicit server/database readiness gating (public intake remains safely disabled until submission guidelines, CAPTCHA, and recipient configuration are approved).
- **Accessibility & Motion Modes**: Explicit two-mode reading preference (**Full motion** vs. **Reduced motion**), OS `prefers-reduced-motion` compliance, full keyboard navigation, skip-to-content links, focus trapping in drawers/dialogs, and responsive layouts verified from `320px` mobile to `1920px` desktop.

### Editorial Administration (`/admin`)
- **Staff Authentication (`/admin/login`, `/admin/recovery`)**: Supabase Auth email/password sign-in and PKCE password recovery flow, gated by active membership in `private.staff_accounts` via database RPC and Row-Level Security (RLS).
- **Editorial Dashboard & CRUD**: Manage articles, cases, approved authors, categories, team records, featured homepage ordering, homepage copy, and contributor submissions.
- **Rich Article Editor**: Tiptap-based structured editor with numbered block/list validation, authorless draft saving, approved-author enforcement on publish, optimistic concurrency checks (`updated_at`), and safe error recovery that never discards unsaved text.
- **Restricted Storage Media Uploads**: Direct staff uploads to private Supabase Storage buckets (`editorial-images`, `case-documents`, `submission-attachments`) with MIME/byte-size enforcement and automatic in-memory signed URL renewal (`src/backend/signed-assets.ts`).

### Portable Node SSR & Security Headers
- **Request-Time HTML Renderer (`scripts/serve-rendered.mjs`, `scripts/serve-review.mjs`)**: Serves server-rendered public HTML, canonical/Open Graph metadata, `/sitemap.xml`, `/robots.txt`, stable `/media/:assetId` cover proxies, and genuine HTTP `404`/`503` status codes.
- **Enforced HTTP Security Policy (`src/ssr/security-headers.ts`)**: Per-request cryptographic CSP nonces, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Cache-Control: private, no-store`.

---

## Quick Start & Local Preview

### Prerequisites
- **Node.js** `>= 20` (tested on Node 24.x)
- **npm** `>= 10`

### 1. Install Dependencies
```bash
npm ci
```
*(If `node_modules` is already present in the working copy, you can run commands immediately.)*

### 2. Run Local Preview in Mock / Demo Mode (Default — No Credentials Needed)
By default (`VITE_DATA_MODE=mock`), the site runs entirely locally with clearly labeled sample records and an interactive demo admin workspace persisted in browser `localStorage`:

```bash
npm run dev
```
Open `http://127.0.0.1:5173` in your browser.

### 3. Run Local SSR Rendered Preview
To build both the client bundle and the portable Node SSR bundle and preview full server-rendered HTML with security headers on port `5190`:

```bash
npm run build:rendered
npm run preview:rendered
```
Open `http://127.0.0.1:5190`.

### 4. Connect to Dedicated Supabase Backend (Optional Local Connected Mode)
Copy `.env.example` to `.env.local` (which is gitignored) and supply the dedicated Supabase project URL and publishable/anon key:

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://erwliwgbjlutczmtqoss.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_WITH_DEDICATED_PROJECT_KEY
```

> **Security Rule:** Never place a `service_role` or `sb_secret_*` key in `.env.local` or any `VITE_*` variable. The frontend runtime (`src/backend/env.ts`) and build guards (`scripts/review-config.mjs`) actively reject secret keys and unexpected `VITE_*` variables.

---

## Quality Assurance & Verification Commands

| Command | Description |
| :--- | :--- |
| `npm run typecheck` | TypeScript strict type-checking (`tsc --noEmit`) |
| `npm run lint` | ESLint static analysis across `src/`, `tests/`, and `scripts/` |
| `npm run check:sql` | PostgreSQL grammar validation of all migrations and pgTAP SQL test suites |
| `npm test` | Vitest unit and integration test suite (20 test files, 101 tests) |
| `npm run build` | Production browser bundle build (`dist/`) |
| `npm run build:rendered` | Production browser (`dist/`) + Node SSR bundle (`dist-server/`) |
| `npm run test:browser` | Playwright Chromium E2E suite in isolated mock mode (`320px`–`1440px`) |
| `npm run test:browser:backend` | Playwright Chromium E2E suite for Supabase adapter, editor, auth, and storage flows (HTTP-intercepted, zero live database writes) |
| `npm run test:browser:security` | Production SSR security-header & CSP enforcement Playwright suite |

---

## Documentation Index

- **[Supabase Integration & Security Report](docs/supabase-integration-and-security.md)** — Architecture, schema, RLS policies, private storage buckets, Edge Functions, and local vs. live capability matrix.
- **[Deployment & Repository Guide](docs/deployment-guide.md)** — Local preview, public GitHub repository (`indo-us-law-forum`) setup, Render SSR review blueprint (`render.yaml`), and production checklist.
- **[Architecture Overview](docs/architecture.md)** — Application structure, providers, and rendering model.
- **[Dedicated Backend Verification](docs/dedicated-backend-verification.md)** — Record of the 86 SQL assertions and 152 live API/browser verification checks on project `erwliwgbjlutczmtqoss`.
- **[Developer & Client Handover](docs/developer-client-handover.md)** — Separation of admin login, notification recipient, and public contact addresses, plus client onboarding sequence.
- **[Client Decisions & Pending Material](docs/client-decisions.md)** — Confirmed taxonomy and pending client content/policy items.
- **[Security Headers Baseline](docs/security-headers.md)** — Nonce-based CSP and HTTP response header specification.
- **[Launch Completion Checklist](docs/completion-checklist.md)** — Verification status and remaining pre-launch gates.
