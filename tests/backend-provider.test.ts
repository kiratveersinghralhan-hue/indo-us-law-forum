import { expect, it, vi } from 'vitest';
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js';
import { createBackendEnvironment } from '../src/backend/provider';
import { researchCategories } from '../src/config/research-categories';

// Transport fakes verify adapter wiring/fail-closed behavior only, never RLS.
function transport() {
  let fail = false,
    role: string | null = null;
  const calls: { table: string; filters: [string, unknown][] }[] = [];
  const tables: Record<string, Record<string, unknown>[]> = {
    categories: [
      {
        id: 'c',
        label: researchCategories[0].label,
        description: '',
        published: true,
      },
    ],
    authors: [
      { id: 'a', label: 'Approved author', description: '', published: true },
    ],
    homepage_settings: [],
    articles: [
      {
        id: 'published',
        slug: 'approved',
        category_id: 'c',
        author_id: 'a',
        status: 'published',
        display_order: 0,
        featured: true,
        updated_at: '2026-10-06',
        data: {
          title: 'Approved title',
          summary: 'Approved summary',
          body: [{ type: 'paragraph', text: 'Approved text' }],
          artwork: 'institutions',
          readingMinutes: 2,
          publicationLabel: '2026-10-06',
          fictional: false,
        },
      },
      {
        id: 'draft',
        slug: 'private-draft',
        category_id: 'c',
        status: 'draft',
        display_order: 1,
        data: { title: 'Private draft' },
      },
    ],
    cases: [],
    team_profiles: [],
    submissions: [],
    content_activity: [],
  };
  let authCallback: (
    event: AuthChangeEvent,
    session: Session | null,
  ) => void = () => {};
  const from = (table: string) => {
    const filters: [string, unknown][] = [];
    let single = false;
    calls.push({ table, filters });
    const q = {
      select: () => q,
      order: () => q,
      eq: (key: string, value: unknown) => {
        filters.push([key, value]);
        return q;
      },
      maybeSingle: () => {
        single = true;
        return q;
      },
      single: () => {
        single = true;
        return q;
      },
      limit: () => q,
      then: (resolve: (value: unknown) => unknown) => {
        const rows = (tables[table] ?? []).filter((r) =>
          filters.every(([k, v]) => r[k] === v),
        );
        return Promise.resolve(
          fail
            ? { data: null, error: { message: 'Backend unavailable' } }
            : { data: single ? (rows[0] ?? null) : rows, error: null },
        ).then(resolve);
      },
    };
    return q;
  };
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === 'staff_role'
        ? role
        : name === 'dashboard_counts'
          ? { drafts: 1, published: 1, pending: 0, cases: 0 }
          : null,
    error: null,
  }));
  const client = {
    from,
    rpc,
    auth: {
      onAuthStateChange: (callback: typeof authCallback) => {
        authCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      },
      stopAutoRefresh: vi.fn(),
    },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: null,
          error: { message: 'Asset unavailable' },
        }),
      }),
    },
  } as unknown as SupabaseClient;
  return {
    client,
    tables,
    emit: (event: AuthChangeEvent, value: Session | null) =>
      authCallback(event, value),
    calls,
    rpc,
    setFailure: () => {
      fail = true;
    },
    setRole: (value: string | null) => {
      role = value;
    },
  };
}
it('backend public adapter explicitly requests published rows and never returns fixture drafts', async () => {
  const t = transport();
  const env = createBackendEnvironment(
    { url: 'https://dedicated.example.test', key: 'sb_publishable_test' },
    t.client,
  );
  const articles = await env.publicProvider.listArticles();
  expect(articles.map((r) => r.slug)).toEqual(['approved']);
  expect(articles[0].sampleAuthor).toBe('Approved author');
  expect((await env.publicProvider.listCategories())[0].slug).toBe(
    researchCategories[0].id,
  );
  expect(
    (
      await env.publicProvider.listArticles({
        category: researchCategories[0].id,
      })
    ).map((r) => r.slug),
  ).toEqual(['approved']);
  expect(
    await env.publicProvider.listArticles({
      category: researchCategories[1].id,
    }),
  ).toEqual([]);
  expect(t.calls.find((c) => c.table === 'articles')?.filters).toContainEqual([
    'status',
    'published',
  ]);
  expect(await env.publicProvider.getArticle('private-draft')).toBeNull();
  t.setFailure();
  await expect(env.publicProvider.listArticles()).rejects.toThrow(
    'Backend unavailable',
  );
  expect(() => env.publicProvider.getSiteSettings()).toThrow();
});

it('backend article features use saved ordered IDs and deliberately refetch after a settings save (transport fake)', async () => {
  const t = transport();
  t.tables.articles.push({
    ...t.tables.articles[0],
    id: 'second',
    slug: 'second',
    featured: false,
  });
  t.tables.homepage_settings = [
    {
      id: true,
      updated_at: '2026-10-10T00:00:00Z',
      data: {
        fictional: false,
        featuredArticleIds: ['second', 'published', 'draft'],
        socialLinks: [],
      },
    },
  ];
  const env = createBackendEnvironment(
    { url: 'https://dedicated.example.test', key: 'sb_publishable_test' },
    t.client,
  );
  await vi.waitFor(() =>
    expect(() => env.publicProvider.getSiteSettings()).not.toThrow(),
  );
  const first = await env.publicProvider.listArticles();
  expect(first.filter((a) => a.featured).map((a) => a.id)).toEqual([
    'second',
    'published',
  ]);
  expect(first.every((a) => a.fictional === false)).toBe(true);
  const revision = env.getRevision();
  t.tables.homepage_settings[0].data = {
    fictional: false,
    featuredArticleIds: ['published'],
    socialLinks: [],
  };
  await env.admin.saveSettings({ fictional: false, socialLinks: [] } as never);
  expect(t.rpc).toHaveBeenCalledWith('save_homepage', {
    payload: { fictional: false, socialLinks: [] },
  });
  expect(env.getRevision()).toBeGreaterThan(revision);
  expect(
    (await env.publicProvider.listArticles())
      .filter((a) => a.featured)
      .map((a) => a.id),
  ).toEqual(['published']);
  env.dispose?.();
});

it('backend repository preview follows saved featured-case order without exposing drafts', async () => {
  const t = transport();
  t.tables.homepage_settings = [
    {
      id: true,
      updated_at: '2026-10-06T00:00:00Z',
      data: { fictional: false, featuredCaseIds: ['second', 'first'] },
    },
  ];
  t.tables.cases = ['first', 'second', 'draft'].map((id, order) => ({
    id,
    slug: id,
    category_id: 'c',
    status: id === 'draft' ? 'draft' : 'published',
    display_order: order,
    featured: true,
    data: {
      title: id,
      reference: id,
      summary: 'Research',
      setting: '',
      tags: [],
      fictional: false,
    },
  }));
  const env = createBackendEnvironment(
    { url: 'https://dedicated.example.test', key: 'sb_publishable_test' },
    t.client,
  );
  await vi.waitFor(() =>
    expect(() => env.publicProvider.getSiteSettings()).not.toThrow(),
  );
  expect((await env.publicProvider.listCases()).map((r) => r.slug)).toEqual([
    'second',
    'first',
  ]);
  expect(
    (await env.publicProvider.listCases({ search: 'first' })).map(
      (r) => r.slug,
    ),
  ).toEqual(['first']);
  env.dispose?.();
});
it('admin snapshot requires current DB authorization; mutations delegate to narrow RPCs', async () => {
  const t = transport();
  const env = createBackendEnvironment(
    { url: 'https://dedicated.example.test', key: 'sb_publishable_test' },
    t.client,
  );
  await expect(env.admin.readSnapshot()).rejects.toThrow('Authorized staff');
  await expect(env.admin.resetDemo()).rejects.toThrow('unavailable');
  await env.admin.reviewSubmission('submission-id', 'approved');
  expect(t.rpc).toHaveBeenCalledWith('review_submission', {
    submission_id: 'submission-id',
    decision: 'approved',
  });
  await env.admin.reorder('articles', ['published', 'draft']);
  expect(t.rpc).toHaveBeenCalledWith('reorder_content', {
    kind: 'articles',
    ids: ['published', 'draft'],
  });
  t.setRole('editor');
  const snapshot = await env.admin.readSnapshot();
  expect(snapshot.articles).toHaveLength(2);
  expect(snapshot.settings.featuredArticleIds).toEqual([]);
  expect(snapshot.settings.fictional).toBe(false);
});

it('token renewal preserves an authorized editor while DB authorization rechecks and app cleanup stops listeners', async () => {
  const t = transport();
  t.setRole('editor');
  const env = createBackendEnvironment(
    { url: 'https://dedicated.example.test', key: 'sb_publishable_test' },
    t.client,
  );
  const session = {
    user: { id: 'staff-test' },
    access_token: 'test-token',
  } as Session;
  t.emit('SIGNED_IN', session);
  await vi.waitFor(() => expect(env.backend!.getSession().role).toBe('editor'));
  t.emit('TOKEN_REFRESHED', session);
  expect(env.backend!.getSession().loading).toBe(false);
  expect(env.backend!.getSession().role).toBe('editor');
  await vi.waitFor(() => expect(env.backend!.getSession().loading).toBe(false));
  env.dispose?.();
  expect(t.client.auth.stopAutoRefresh).toHaveBeenCalled();
});
