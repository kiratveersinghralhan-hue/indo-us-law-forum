import { afterEach, expect, it } from 'vitest';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import { createPublicationServer } from '../src/server/http';
import { sitemap } from '../src/server/render';
import type { WebsiteEnvironment } from '../src/backend/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Article, ContentProvider, ResearchCase } from '../src/data/types';
import { defaultSiteSettings } from '../src/data/site-settings';

// Local HTTP/SSR fixtures only. Never writes to Supabase or claims database proof.
const servers: Server[] = [];

it('pages a published-only sitemap beyond the Data API row limit without signing images', async () => {
  const starts: number[] = [];
  const client = {
    from: (table: string) => {
      let start = 0,
        end = 0;
      const query = {
        select: (columns: string) => {
          expect(columns).toBe('slug,updated_at');
          return query;
        },
        eq: (column: string, value: string) => {
          expect([column, value]).toEqual(['status', 'published']);
          return query;
        },
        order: () => query,
        range: (from: number, to: number) => {
          start = from;
          end = to;
          starts.push(start);
          return query;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            error: null,
            data:
              table === 'articles'
                ? Array.from({ length: 1001 }, (_, i) => ({
                    slug: `index-test-${i}`,
                    updated_at: '2026-10-10T00:00:00Z',
                  })).slice(start, end + 1)
                : [],
          }).then(resolve),
      };
      return query;
    },
  } as unknown as SupabaseClient;
  const xml = await sitemap(
    { backend: { client } } as WebsiteEnvironment,
    'http://127.0.0.1:5199',
  );
  expect(xml).toContain('/articles/index-test-1000');
  expect(xml.match(/<url>/g)).toHaveLength(1005);
  expect(starts).toEqual([0, 1000, 0]);
});
afterEach(async () => {
  await Promise.all(
    servers.map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve())),
    ),
  );
  servers.length = 0;
});
async function fixture(indexable = false) {
  const article: Article & { updatedAt: string } = {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'rendering-test-only',
    title: 'RENDERING TEST ONLY <unsafe>',
    summary: 'TEST ONLY "summary" & context',
    body: [
      {
        type: 'paragraph',
        text: 'TEST ONLY server-visible article body </script><script>bad()</script>',
      },
    ],
    categoryId: 'test',
    categoryLabel: 'Test category',
    sampleAuthor: 'Test attribution',
    fictional: false,
    readingMinutes: 2,
    publicationLabel: '10 October 2026',
    artwork: 'institutions',
    featured: true,
    coverAssetId: '22222222-2222-4222-8222-222222222222',
    coverUrl: 'https://example.invalid/temporary?token=NEVER_PERMANENT',
    updatedAt: '2026-10-10T10:00:00Z',
  };
  const record: ResearchCase = {
    slug: 'rendering-case-test-only',
    title: 'RENDERING CASE TEST ONLY',
    summary: 'Case summary test only',
    categoryId: 'test',
    categoryLabel: 'Test category',
    kind: 'Research note',
    reference: 'TEST ONLY',
    setting: 'Test setting',
    tags: ['test'],
    dateLabel: '10 October 2026',
    sourceNote: 'Test source',
    body: [{ type: 'paragraph', text: 'TEST ONLY server-visible case body' }],
    fictional: false,
  };
  let published = true,
    fail = false;
  const provider: ContentProvider = {
    getSiteSettings: () => structuredClone(defaultSiteSettings),
    listCategories: async () => {
      if (fail) throw Error('Test outage');
      return [];
    },
    listTeam: async () => [],
    listArticles: async () => {
      if (fail) throw Error('Test outage');
      return published ? [article] : [];
    },
    getArticle: async (slug) =>
      published && article.slug === slug ? article : null,
    listCases: async () => {
      if (fail) throw Error('Test outage');
      return published ? [record] : [];
    },
    getCase: async (slug) =>
      published && record.slug === slug ? record : null,
  };
  const environment = {
    publicProvider: provider,
    backend: {},
    subscribe: () => () => {},
    getRevision: () => 0,
    refresh: () => {},
    admin: {},
    dispose: () => {},
  } as unknown as WebsiteEnvironment;
  const server = createPublicationServer({
    indexable,
    origin: 'http://127.0.0.1:5199',
    root: resolve('public'),
    template:
      '<!doctype html><html><head><title>shell</title><meta name="robots" content="noindex, nofollow"></head><body><div id="root"></div><script type="module" src="/assets/app.js"></script></body></html>',
    environment: async () => environment,
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw Error('Local test server unavailable');
  const get = (path: string, options?: RequestInit) =>
    fetch(`http://127.0.0.1:${address.port}${path}`, options);
  return {
    get,
    article,
    record,
    setPublished: (value: boolean) => {
      published = value;
    },
    setFailure: () => {
      fail = true;
    },
  };
}

it('returns real article/case HTML and escaped metadata before JavaScript, with stable image URLs', async () => {
  const f = await fixture();
  const response = await f.get('/articles/rendering-test-only');
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain('class="reading-content"');
  expect(html).toContain('TEST ONLY server-visible article body');
  expect(html).toContain('&lt;unsafe&gt;');
  expect(html).not.toContain('<script>bad()');
  expect(html).toContain('property="og:title"');
  expect(html).toContain(
    'name="description" content="TEST ONLY &quot;summary&quot; &amp; context"',
  );
  expect(html).toContain(
    'rel="canonical" href="http://127.0.0.1:5199/articles/rendering-test-only"',
  );
  expect(html).toContain(
    'property="og:image" content="http://127.0.0.1:5199/media/22222222-2222-4222-8222-222222222222"',
  );
  expect(html).not.toContain('NEVER_PERMANENT');
  expect(html).toContain('\\u003c/script>');
  const caseResponse = await f.get('/cases/rendering-case-test-only');
  expect(caseResponse.status).toBe(200);
  expect(await caseResponse.text()).toContain(
    'TEST ONLY server-visible case body',
  );
});

it('reflects publication/edit/slug change/unpublish in the next HTML and sitemap request without a rebuild', async () => {
  const f = await fixture();
  f.setPublished(false);
  expect((await f.get('/articles/rendering-test-only')).status).toBe(404);
  expect(await (await f.get('/sitemap.xml')).text()).not.toContain(
    'rendering-test-only',
  );
  f.setPublished(true);
  expect((await f.get('/articles/rendering-test-only')).status).toBe(200);
  f.article.title = 'RENDERING EDIT TEST ONLY';
  expect(await (await f.get('/articles/rendering-test-only')).text()).toContain(
    'RENDERING EDIT TEST ONLY',
  );
  f.article.slug = 'new-test-slug';
  expect((await f.get('/articles/rendering-test-only')).status).toBe(404);
  expect((await f.get('/articles/new-test-slug')).status).toBe(200);
  const sitemap = await (await f.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/articles/new-test-slug');
  expect(sitemap).toContain('/cases/rendering-case-test-only');
  expect(sitemap).toContain('<lastmod>2026-10-10T10:00:00.000Z</lastmod>');
  expect(sitemap).not.toMatch(/\/admin|\/submit|token=/);
  f.setPublished(false);
  expect(
    (
      await f.get('/articles/new-test-slug', {
        headers: { Authorization: 'Bearer test-staff-token' },
      })
    ).status,
  ).toBe(404);
  expect((await f.get('/cases/rendering-case-test-only')).status).toBe(404);
});

it('uses genuine 404/405 responses and private no-store/noindex admin HTML', async () => {
  const f = await fixture();
  for (const path of [
    '/unknown-route',
    '/articles/draft-test-only',
    '/cases/draft-test-only',
    '/media/not-a-uuid',
    '/.env.local',
    '/assets/missing.js',
  ])
    expect((await f.get(path)).status, path).toBe(404);
  expect((await f.get('/', { method: 'POST' })).status).toBe(405);
  const admin = await f.get('/admin/login');
  expect(admin.headers.get('cache-control')).toBe('private, no-store');
  expect(admin.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  expect(await admin.text()).not.toContain('RENDERING TEST ONLY');
  expect(await (await f.get('/robots.txt')).text()).toContain('Disallow: /');
});

it('returns 503 for backend failure rather than a misleading missing record or sample fallback', async () => {
  const f = await fixture();
  f.setFailure();
  for (const path of ['/articles/rendering-test-only', '/sitemap.xml']) {
    const response = await f.get(path);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.text()).not.toContain('TEST ONLY server-visible');
  }
});

it('protects HTML, admin, sitemap, errors and HEAD without changing cache/indexing semantics', async () => {
  const f = await fixture();
  const nonces = new Set<string>();
  for (const [path, method, status] of [
    ['/articles/rendering-test-only', 'GET', 200],
    ['/admin/login', 'GET', 200],
    ['/sitemap.xml', 'GET', 200],
    ['/unknown-route', 'GET', 404],
    ['/assets/missing.js', 'GET', 404],
    ['/', 'POST', 405],
    ['/admin/recovery', 'HEAD', 200],
    ['/fonts/source-serif-4.woff2', 'GET', 200],
    ['/artwork/publication-neutral.svg', 'GET', 200],
    ['/robots.txt', 'GET', 200],
    ['/media/not-a-uuid', 'GET', 404],
  ] as const) {
    const response = await f.get(path, { method });
    expect(response.status, path).toBe(status);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('permissions-policy')).toContain('camera=()');
    expect(response.headers.has('strict-transport-security')).toBe(false);
    const csp = response.headers.get('content-security-policy')!;
    const nonce = csp.match(/'nonce-([^']+)'/)![1];
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{24}$/);
    expect(nonces.has(nonce)).toBe(false);
    nonces.add(nonce);
    expect(csp).not.toMatch(/unsafe-eval|https:;|\*|report-uri|report-to/);
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain(
      "connect-src 'self' https://erwliwgbjlutczmtqoss.supabase.co;",
    );
    if (method === 'HEAD') expect(await response.text()).toBe('');
    else if (response.headers.get('content-type')?.startsWith('text/html')) {
      const html = await response.text();
      for (const script of html.matchAll(/<script\b[^>]*>/g))
        expect(script[0]).toContain(`nonce="${nonce}"`);
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  }
  f.setFailure();
  const outage = await f.get('/sitemap.xml');
  expect(outage.status).toBe(503);
  expect(outage.headers.get('content-security-policy')).toContain(
    "default-src 'none'",
  );
  expect(outage.headers.get('x-frame-options')).toBe('DENY');
  expect(outage.headers.get('x-robots-tag')).toBe('noindex, nofollow');
});

it('keeps explicitly indexable public metadata separate from private admin indexing', async () => {
  const f = await fixture(true);
  const article = await f.get('/articles/rendering-test-only');
  expect(article.headers.get('x-robots-tag')).toBe('index, follow');
  expect(await article.text()).toContain(
    'name="robots" content="index, follow"',
  );
  expect((await f.get('/admin/login')).headers.get('x-robots-tag')).toBe(
    'noindex, nofollow',
  );
  expect(
    (await f.get('/articles/rendering-test-only?q=private-query')).headers.get(
      'x-robots-tag',
    ),
  ).toBe('noindex, nofollow');
});
