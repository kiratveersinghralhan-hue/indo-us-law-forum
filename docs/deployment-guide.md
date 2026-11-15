# Setup, Local Preview, GitHub & Deployment Guide

## 1. Local Development & Preview Instructions

### Option A: Interactive Demo / Mock Mode (Zero Configuration)
Mock mode is ideal for reviewing the complete UI, 3D publication sculpture, 360-degree research carousel, responsive layouts, and full admin workflow with sample data:

```bash
# 1. Install dependencies (if not already installed)
npm ci

# 2. Start the local Vite development server (defaults to VITE_DATA_MODE=mock)
npm run dev
```
- **Public Website:** `http://127.0.0.1:5173/`
- **Articles & Filtering:** `http://127.0.0.1:5173/articles`
- **Case Repository:** `http://127.0.0.1:5173/cases`
- **Team Directory:** `http://127.0.0.1:5173/team`
- **Submissions Page:** `http://127.0.0.1:5173/submit`
- **Editorial Admin Workspace:** `http://127.0.0.1:5173/admin`

### Option B: Local Production SSR Preview (Server-Rendered HTML + Security Headers)
To test the production Node HTTP renderer, per-request CSP nonces, Open Graph tags, `/sitemap.xml`, and genuine `404` responses locally:

```bash
npm run build:rendered
npm run preview:rendered
```
- **Rendered Preview URL:** `http://127.0.0.1:5190/`

### Option C: Connected Supabase Mode
To run against the dedicated Supabase project (`erwliwgbjlutczmtqoss`):

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Set the following in `.env.local` (never commit `.env.local`):
   ```dotenv
   VITE_DATA_MODE=supabase
   VITE_SUPABASE_URL=https://erwliwgbjlutczmtqoss.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY_HERE
   ```
3. Run `npm run dev` (port `5173`) or `npm run build:rendered && npm run preview:rendered` (port `5190`).

---

## 2. Publishing to the New Public GitHub Repository (`indo-us-law-forum`)

The release candidate workspace has been audited and prepared for a brand-new **public** GitHub repository named `indo-us-law-forum`:
- All personal developer email addresses, internal UUIDs, local filesystem paths, and references to the deleted repository have been removed.
- `.gitignore` excludes `node_modules/`, `dist/`, `dist-server/`, `.qa/`, `.env*` (except `.env.example`), `.supabase/`, and temporary caches.
- No secrets, tokens, or credentials exist in any tracked file or commit history.

### Commands to Create and Push the Public Repository (After Your Approval)
Once you approve creating the public remote and pushing:

```bash
# Inside the repository root directory
git status

# Create the public repository on GitHub using GitHub CLI (or via github.com/new):
gh repo create indo-us-law-forum --public --source=. --remote=origin --push
```
Or if creating the empty repository manually at `https://github.com/new` (named `indo-us-law-forum`, Public, without initializing a README):
```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/indo-us-law-forum.git
git branch -M main
git push -u origin main
```

---

## 3. Hosted Review & Production Deployment

### Guarded Review Deployment (`render.yaml`)
The repository includes a validated `render.yaml` Blueprint for running the Node SSR server (`scripts/serve-review.mjs`):
- **Build Command:** `npm ci --include=dev && npm run build:review`
- **Start Command:** `npm run start:review`
- **Required Environment Variables on Host:**
  - `VITE_DATA_MODE=supabase`
  - `VITE_SUPABASE_URL=https://erwliwgbjlutczmtqoss.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=<set privately in host dashboard; sync: false>`
  - `SITE_INDEXABLE=false` (during review; set to `true` with `PUBLIC_SITE_ORIGIN=https://<approved-domain>` only when launching publicly with approved content)

### Pre-Launch Production Checklist
Before switching `SITE_INDEXABLE=true` on a production domain:
1. **Provision Client Staff Account:** Create the client's Auth account in Supabase Dashboard (`Authentication -> Users`) and insert their confirmed UUID into `private.staff_accounts` (`role = 'admin'`, `active = true`).
2. **Publish Approved Content:** Sign in at `/admin`, upload approved cover artwork and team portraits, publish approved articles and categories, and save `Homepage & content` settings (including official public contact email).
3. **Configure Production Domain & Redirects:** Update Supabase Auth `Site URL` and add `https://<APPROVED_DOMAIN>/admin/recovery` to the Auth redirect allowlist.
4. **Verify HSTS & TLS:** Confirm the production reverse proxy/CDN serves `Strict-Transport-Security` (HSTS) alongside the Node server's existing CSP and security headers.
