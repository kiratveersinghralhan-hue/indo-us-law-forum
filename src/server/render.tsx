import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { ServerRoutes } from './server-routes';
import { createClient } from '@supabase/supabase-js';
import { createBackendEnvironment } from '../backend/provider';
import type { WebsiteEnvironment } from '../backend/contracts';
import type { Article, ResearchCase, TeamProfile } from '../data/types';
import { DemoDataRoot } from '../admin/demo-data-root';
import { ResourceSeedContext } from '../hooks/resource-seed';
import { brand } from '../config/brand';
import { defaultDescription } from '../config/seo';
export { createPublicationServer } from './http';

export async function publicEnvironment(url: string, key: string) {
  if (
    url !== 'https://erwliwgbjlutczmtqoss.supabase.co' ||
    !key.startsWith('sb_publishable_')
  )
    throw Error(
      'Only the dedicated project and a publishable key are allowed.',
    );
  const client = createClient(url, key, {
    db: { timeout: 10_000, retry: false },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const environment = createBackendEnvironment({ url, key }, client);
  await environment.ready;
  return environment;
}

export const escapeHTML = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]!,
  );
export const serializeSeed = (seed: unknown) =>
  JSON.stringify(seed)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
const image = <T extends { coverAssetId?: string; coverUrl?: string }>(
  value: T,
): T => ({
  ...value,
  coverUrl: value.coverAssetId
    ? `/media/${encodeURIComponent(value.coverAssetId)}`
    : undefined,
});

export async function renderPublic(
  href: string,
  environment: WebsiteEnvironment,
) {
  const url = new URL(href);
  const path = url.pathname;
  const provider = environment.publicProvider;
  const seed: Record<string, unknown> = {};
  let status = 200,
    title = 'India-US Cross Border Law',
    description = defaultDescription;
  let imagePath: string | undefined;
  const categories = await provider.listCategories();
  seed.categories = categories;
  if (path === '/') {
    const [articles, cases, team] = await Promise.all([
      provider.listArticles(),
      provider.listCases(),
      provider.listTeam(),
    ]);
    seed.home = {
      articles: articles.map(image),
      categories,
      cases,
      team: team.map(image),
    };
  } else if (path === '/team') {
    seed.team = (await provider.listTeam()).map(image);
    title = 'Team';
  } else if (path === '/articles') {
    const category = url.searchParams.get('category') ?? '',
      search = url.searchParams.get('q') ?? '';
    seed[`articles:${category}:${search}`] = {
      articles: (await provider.listArticles({ category, search })).map(image),
    };
    title = 'Articles';
  } else if (path === '/cases') {
    const category = url.searchParams.get('category') ?? '',
      search = url.searchParams.get('q') ?? '',
      kind = url.searchParams.get('kind') ?? '';
    seed[`cases:${category}:${search}:${kind}`] = {
      cases: await provider.listCases({ category, search, kind }),
    };
    title = 'Cases';
  } else if (path.startsWith('/articles/')) {
    const slug = decodeURIComponent(path.slice('/articles/'.length));
    const [article, articles] = await Promise.all([
      provider.getArticle(slug),
      provider.listArticles(),
    ]);
    seed[`article:${slug}`] = {
      article: article ? image(article) : null,
      articles: articles.map(image),
    };
    if (!article) {
      status = 404;
      title = 'Article not found';
    } else {
      title = article.title;
      description = article.summary;
      imagePath = image(article).coverUrl;
    }
  } else if (path.startsWith('/cases/')) {
    const slug = decodeURIComponent(path.slice('/cases/'.length));
    const record = await provider.getCase(slug);
    seed[`case:${slug}`] = record;
    if (!record) {
      status = 404;
      title = 'Case not found';
    } else {
      title = record.title;
      description = record.summary;
    }
  } else if (path === '/submit') title = 'Submit an article';
  else {
    status = 404;
    title = 'Page not found';
  }
  const renderEnvironment = {
    ...environment,
    backend: environment.backend
      ? { ...environment.backend, images: undefined }
      : undefined,
  };
  const markup = renderToString(
    <StaticRouter location={path + url.search}>
      <ResourceSeedContext.Provider value={seed}>
        <DemoDataRoot environment={renderEnvironment}>
          <ServerRoutes />
        </DemoDataRoot>
      </ResourceSeedContext.Provider>
    </StaticRouter>,
  );
  return {
    markup,
    seed,
    status,
    title: `${title} · ${brand.name}`,
    description,
    imagePath,
  };
}

export async function sitemap(environment: WebsiteEnvironment, origin: string) {
  const entries: { path: string; updated?: string }[] = [
    '/',
    '/articles',
    '/cases',
    '/team',
  ].map((path) => ({ path }));
  const client = environment.backend?.client;
  if (client) {
    // Page beyond the Data API row cap without signing covers for an XML index.
    for (const table of ['articles', 'cases'] as const) {
      for (let start = 0; ; start += 1000) {
        const result = await client
          .from(table)
          .select('slug,updated_at')
          .eq('status', 'published')
          .order('id')
          .range(start, start + 999);
        if (result.error) throw Error('Publication index unavailable.');
        const rows = result.data ?? [];
        rows.forEach((record) =>
          entries.push({
            path: `/${table}/${encodeURIComponent(record.slug)}`,
            updated: record.updated_at,
          }),
        );
        if (rows.length < 1000) break;
      }
    }
  } else {
    const [articles, cases] = await Promise.all([
      environment.publicProvider.listArticles(),
      environment.publicProvider.listCases(),
    ]);
    articles.forEach((record) =>
      entries.push({
        path: `/articles/${encodeURIComponent(record.slug)}`,
        updated: (record as Article & { updatedAt?: string }).updatedAt,
      }),
    );
    cases.forEach((record) =>
      entries.push({
        path: `/cases/${encodeURIComponent(record.slug)}`,
        updated: (record as ResearchCase & { updatedAt?: string }).updatedAt,
      }),
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries
    .map((entry) => {
      const time = entry.updated && new Date(entry.updated);
      return `<url><loc>${escapeHTML(new URL(entry.path, origin).href)}</loc>${time && Number.isFinite(time.getTime()) ? `<lastmod>${time.toISOString()}</lastmod>` : ''}</url>`;
    })
    .join('')}</urlset>`;
}
// Type exports let tests use the same public contract without importing fixtures.
export type PublicRecords = {
  articles: Article[];
  cases: ResearchCase[];
  team: TeamProfile[];
};
