# Portable security headers — 11 October 2026

The existing Node renderer now applies the baseline to every response, including public/admin HTML, sitemap, static assets/fonts, image delivery and 404/405/503 errors. No hosting platform was chosen. No Supabase/configuration/permission/data changes, emails, deployments or pushes occurred. Intake, notifications and analytics remain disabled.

## Policy and compatibility

| Header | Baseline |
| --- | --- |
| Content-Security-Policy | Enforced; default deny, same-origin application scripts/styles/fonts, response nonces and the exact dedicated Supabase origin for connections/images |
| X-Frame-Options | `DENY`, alongside CSP `frame-ancestors 'none'` |
| X-Content-Type-Options | `nosniff`, retained |
| Referrer-Policy | `no-referrer`; article paths, recovery queries and signed-image URL details are not forwarded as referrers |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=()`; ordinary file selection, WebGL, pointer/keyboard and scrolling remain available |

`src/server/security-headers.ts` constructs the policy. Each response gets a cryptographically random 144-bit nonce. Only scripts in the trusted build template and the escaped inert JSON bootstrap receive it; rendered article content is never processed to add a nonce. Tiptap reads the entry script's nonce and uses its existing `injectNonce` option for its injected stylesheet. Ordinary Vite development retains its existing behavior when no nonce exists.

The CSP permits:

- Scripts from `'self'` and the response nonce, including lazy module imports. Inline handlers, arbitrary inline scripts, eval and WebAssembly eval are not allowed. Three.js's existing WebGL/shader path needs none of those exceptions.
- Stylesheets from `'self'` or the nonce. **Only style attributes** have `'unsafe-inline'`, preserving existing React SSR style attributes and motion/custom properties. This does not grant arbitrary style elements or inline JavaScript permission.
- Fonts from `'self'`. The renderer now serves the existing `/fonts/` files with their font MIME type; previously that static prefix was omitted, causing rendered-page font requests to fall into the not-found route. No font or licence text changed.
- Images from `'self'`, `data:`, `blob:` and `https://erwliwgbjlutczmtqoss.supabase.co`; fetch connections only from `'self'` and that exact Supabase origin. Blob previews and signed-cover WebGL textures work. No wildcard Supabase domains, arbitrary HTTPS hosts, remote font/CDN scripts or broad connection schemes are allowed. An explicit loopback-only origin option exists for isolated tests; the normal renderer defaults to the dedicated project.

Objects, frames, workers and base-URL overrides are denied; form actions stay same-origin. No remote violation-report endpoint or analytics connection is added. Realtime WebSockets and Turnstile's third-party script/frame are not currently used by the enabled app and are not allowlisted. Any future intake/CAPTCHA/realtime activation requires a separate explicit policy review; do not loosen this policy to enable it implicitly.

The existing `private, no-store` responses, anonymous server reads, publication/update path, public metadata and private/noindex admin behavior are unchanged. Nonces are not stored in database content or browser storage. A plain Vite preview does not emit these HTTP headers; use the rendered server for header verification.

References: [MDN script policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src), [style-attribute scope](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr), [Tiptap injectNonce](https://tiptap.dev/docs/editor/api/editor#injectnonce), [framing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options), [Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy).

## Eventual hosting layer — still pending

1. Forward the renderer's CSP and nonce-bearing HTML together without rewriting scripts or appending a conflicting policy. Preserve no-store, private admin/auth responses and indexing defaults; do not cache nonce-bearing HTML independently of its matching headers. Review invalidation before introducing a CDN page cache.
2. Apply equivalent framing, referrer, MIME and permissions protections to proxy/CDN-generated errors and responses that bypass Node. Serve the existing assets/fonts with correct MIME types and paths. Do not expose `.env`, QA, source, CLI cache or server bundles as public static files.
3. Configure HTTPS/redirects and **HSTS at the TLS-terminating host**, after the real domain and complete HTTPS coverage are approved. Subdomain/preload commitments need explicit review. This local HTTP implementation intentionally adds neither HSTS nor `upgrade-insecure-requests`.
4. Verify actual effective headers, authenticated redirects, crawler/social-image access, fonts, auth, upload previews, 3D and browser compatibility on that host. No COOP/COEP isolation or cross-origin resource restriction was introduced; such changes require separate auth/new-tab/image compatibility review.

## Verification

Reproduce locally without backend writes:

```powershell
npm test -- --maxWorkers=1 tests/security-headers.test.ts tests/rendered-http.test.ts tests/seo-metadata.test.ts tests/article-editor.test.ts
npm run build:rendered
npm run test:browser:security
npm run lint
npm run typecheck
```

The security browser harness serves the **production renderer and bundles** on loopback 5193. Server-rendered records are isolated in-memory fixtures; all browser backend traffic is intercepted at the dedicated origin. It does not construct a real server-side Supabase client, create remote content or send recovery mail. Test captures/traces remain in ignored `.qa/`.

Completed results:

- **16 tests / four files passed**: policy origin restrictions, response headers/nonces across HTML/sitemap/static/error/HEAD responses, preserved metadata/indexing/cache behavior, publication updates/unpublication and editor validation. An initial parallel run had a worker-startup timeout; the complete focused suite passed with one worker.
- **Three Chromium production-renderer scenarios passed**: local fonts, signed covers, Full/Reduced WebGL and carousel; mocked invalid/successful authentication, recovery UI, Tiptap nonce, blob previews/upload/save; rejection of unauthorized scripts, style elements, foreign images and connections. Normal flows produced no CSP violations; the negative test deliberately generated them.
- **Three additional existing mocked editor scenarios passed**: upload denial/retry/persistence/public cover at 390px and 1440px, plus empty-bullet correction/authorless draft. The bullet check initially failed after immediately typing following “Go to item”; it passed on an isolated rerun without application changes. This intermittent timing failure remains recorded rather than counted as an uninterrupted pass.
- **Lint, TypeScript and production browser/SSR builds passed.** `git diff --check` passed. The existing WebGL bundle-size advisory remains.

These are local HTTP/browser policy checks, not new Auth/RLS/Storage proof, production TLS/CDN verification or a complete security audit. Physical-device, Safari/Firefox and full recovery-email testing remain pending. No real recovery email was sent and no remote data or permissions changed.
