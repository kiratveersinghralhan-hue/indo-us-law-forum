import { describe, expect, it } from 'vitest';
import {
  createAppProviders,
  createDemoEnvironment,
  demoStoreKey,
} from '../src/admin/mock-admin-provider';

function setup() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  return { values, storage, env: createDemoEnvironment(storage) };
}
describe('explicit local admin/public boundary', () => {
  it('derives counts from actual seeds, clones reads, and withholds drafts', async () => {
    const { env, values } = setup();
    const snapshot = await env.admin.readSnapshot();
    expect(snapshot.articles.filter((a) => a.status === 'draft')).toHaveLength(
      1,
    );
    expect(
      snapshot.articles.filter((a) => a.status === 'published'),
    ).toHaveLength(9);
    expect(snapshot.cases).toHaveLength(5);
    expect(
      snapshot.submissions.filter((s) => s.status === 'pending'),
    ).toHaveLength(2);
    expect(await env.publicProvider.listArticles()).toHaveLength(9);
    expect(await env.publicProvider.listCases()).toHaveLength(4);
    expect((await env.publicProvider.listArticles())[0]).not.toHaveProperty(
      'status',
    );
    expect((await env.publicProvider.listArticles())[0]).not.toHaveProperty(
      'submissionId',
    );
    expect(
      await env.publicProvider.getArticle('sample-draft-awaiting-review'),
    ).toBeNull();
    snapshot.articles[0].title = 'External mutation';
    expect((await env.admin.readSnapshot()).articles[0].title).not.toBe(
      'External mutation',
    );
    expect(values.size).toBe(0);
  });
  it('creates, edits, publishes, unpublishes and deletes only demo articles', async () => {
    const { env } = setup();
    const seed = await env.admin.readSnapshot();
    let article = await env.admin.saveArticle({
      ...seed.articles[0],
      id: '',
      slug: 'sample-new',
      title: 'New fictional article',
      status: 'draft',
      featured: false,
    });
    expect(article.id).toBeTruthy();
    expect(await env.publicProvider.getArticle(article.slug)).toBeNull();
    article = await env.admin.saveArticle({
      ...article,
      status: 'published',
      summary: 'Edited excerpt',
    });
    expect((await env.publicProvider.getArticle(article.slug))?.summary).toBe(
      'Edited excerpt',
    );
    article = await env.admin.saveArticle({ ...article, status: 'draft' });
    expect(await env.publicProvider.getArticle(article.slug)).toBeNull();
    await env.admin.deleteRecord('articles', article.id);
    expect(
      (await env.admin.readSnapshot()).articles.some(
        (a) => a.id === article.id,
      ),
    ).toBe(false);
    await expect(env.admin.saveArticle(article)).rejects.toThrow('removed');
  });
  it('rejects duplicate or unsafe slugs and unsupported content', async () => {
    const { env } = setup();
    const article = (await env.admin.readSnapshot()).articles[0];
    await expect(env.admin.saveArticle({ ...article, id: '' })).rejects.toThrow(
      'slug',
    );
    await expect(
      env.admin.saveArticle({ ...article, slug: 'Bad / slug' }),
    ).rejects.toThrow('lowercase');
    await expect(
      env.admin.saveArticle({
        ...article,
        body: [{ type: 'html', text: '<script/>' }] as never,
      }),
    ).rejects.toThrow(
      'Content block 1 is unsupported. Use a paragraph, heading, note or bullet list.',
    );
    await expect(
      env.admin.saveArticle({ ...article, artwork: 'toString' as never }),
    ).rejects.toThrow('artwork');
    await expect(
      env.admin.saveArticle({ ...article, fictional: false as never }),
    ).rejects.toThrow('fictional');
  });
  it('approves and converts once, only to a draft, including repeated simultaneous calls', async () => {
    const { env } = setup();
    const id = (await env.admin.readSnapshot()).submissions[0].id;
    await expect(env.admin.convertSubmission(id)).rejects.toThrow('Approve');
    await env.admin.reviewSubmission(id, 'approved');
    const [a, b] = await Promise.all([
      env.admin.convertSubmission(id),
      env.admin.convertSubmission(id),
    ]);
    expect(a.id).toBe(b.id);
    expect(a.status).toBe('draft');
    expect(
      (await env.admin.readSnapshot()).articles.filter(
        (r) => r.submissionId === id,
      ),
    ).toHaveLength(1);
    expect(await env.publicProvider.getArticle(a.slug)).toBeNull();
    await expect(env.admin.reviewSubmission(id, 'rejected')).rejects.toThrow(
      'converted',
    );
    await env.admin.deleteRecord('articles', a.id);
    await expect(env.admin.convertSubmission(id)).rejects.toThrow(
      'cannot be converted again',
    );
  });
  it('rejects a submission without publishing or converting', async () => {
    const { env } = setup();
    const id = (await env.admin.readSnapshot()).submissions[1].id;
    await env.admin.reviewSubmission(id, 'rejected');
    await expect(env.admin.convertSubmission(id)).rejects.toThrow('Approve');
    expect(await env.publicProvider.listArticles()).toHaveLength(9);
  });
  it('creates/edits cases, validates metadata, and reflects publication and document labels', async () => {
    const { env } = setup();
    const base = (await env.admin.readSnapshot()).cases[0];
    let item = await env.admin.saveCase({
      ...base,
      id: '',
      slug: 'local-case',
      status: 'draft',
      supportingDocuments: ['Sample note — not uploaded'],
    });
    expect(await env.publicProvider.getCase(item.slug)).toBeNull();
    item = await env.admin.saveCase({
      ...item,
      status: 'published',
      tags: ['fictional'],
    });
    expect(
      (await env.publicProvider.getCase(item.slug))?.supportingDocuments,
    ).toEqual(['Sample note — not uploaded']);
    await expect(
      env.admin.saveCase({ ...item, kind: 'unknown' as never }),
    ).rejects.toThrow('supported');
    await env.admin.deleteRecord('cases', item.id);
    expect(await env.publicProvider.getCase(item.slug)).toBeNull();
  });
  it('edits/reorders neutral sample profiles and rejects credential/script links', async () => {
    const { env } = setup();
    let team = (await env.admin.readSnapshot()).team;
    const member = await env.admin.saveTeam({
      ...team[0],
      id: '',
      label: 'Sample editor Z',
      order: team.length,
      links: [{ label: 'Sample site', url: 'https://example.org' }],
    });
    await expect(
      env.admin.saveTeam({
        ...member,
        links: [{ label: 'Unsafe', url: 'javascript:alert(1)' }],
      }),
    ).rejects.toThrow('HTTP/HTTPS');
    await expect(
      env.admin.saveTeam({
        ...member,
        links: [{ label: 'Unsafe', url: 'https://user:password@example.org' }],
      }),
    ).rejects.toThrow('credentials');
    team = (await env.admin.readSnapshot()).team;
    await env.admin.reorder('team', [
      member.id,
      ...team.filter((t) => t.id !== member.id).map((t) => t.id),
    ]);
    expect((await env.publicProvider.listTeam())[0].label).toBe(
      'Sample editor Z',
    );
    await env.admin.deleteRecord('team', member.id);
    expect(await env.publicProvider.listTeam()).toHaveLength(3);
  });
  it('saves existing homepage sections/copy and featured order without inventing a page builder', async () => {
    const { env } = setup();
    const snapshot = await env.admin.readSnapshot();
    const settings = structuredClone(snapshot.settings);
    settings.hero.lines[0] = 'Sample reading';
    settings.categories[0].description = 'Sample description updated';
    settings.sections.reverse();
    settings.sections[0].visible = false;
    settings.featuredArticleIds.reverse();
    settings.featuredCaseIds.reverse();
    await env.admin.saveSettings(settings);
    expect(env.publicProvider.getSiteSettings().hero.lines[0]).toBe(
      'Sample reading',
    );
    expect(env.publicProvider.getSiteSettings().sections[0].visible).toBe(
      false,
    );
    expect((await env.publicProvider.listArticles())[0].slug).toBe(
      snapshot.articles.find((a) => a.id === settings.featuredArticleIds[0])!
        .slug,
    );
    expect((await env.publicProvider.listCategories())[0].description).toBe(
      'Sample description updated',
    );
    await expect(
      env.admin.saveSettings({
        ...settings,
        sections: settings.sections.slice(1),
      }),
    ).rejects.toThrow('exactly once');
    await expect(env.admin.reorder('articles', ['missing'])).rejects.toThrow(
      'list changed',
    );
  });
  it('persists only in its namespace, preserves preferences on reset, and refreshes separate environments', async () => {
    const { env, storage, values } = setup();
    values.set('editorial-motion-mode', 'full');
    const second = createDemoEnvironment(storage);
    const base = (await env.admin.readSnapshot()).articles[0];
    await env.admin.saveArticle({ ...base, title: 'First tab fictional edit' });
    const team = (await second.admin.readSnapshot()).team[0];
    await second.admin.saveTeam({ ...team, role: 'Second tab sample edit' });
    env.refresh();
    expect((await env.admin.readSnapshot()).articles[0].title).toBe(
      'First tab fictional edit',
    );
    expect((await env.admin.readSnapshot()).team[0].role).toBe(
      'Second tab sample edit',
    );
    await env.admin.resetDemo();
    expect(values.get('editorial-motion-mode')).toBe('full');
    expect(values.has(demoStoreKey)).toBe(true);
    expect((await env.admin.readSnapshot()).articles[0].title).not.toBe(
      'First tab fictional edit',
    );
  });
  it('fails visibly on corrupt existing storage instead of silently loading mock fallback, and reset repairs it', async () => {
    const { storage, values } = setup();
    values.set(demoStoreKey, '{"version":99}');
    const env = createDemoEnvironment(storage);
    await expect(env.admin.readSnapshot()).rejects.toThrow('No fallback');
    await expect(env.publicProvider.listArticles()).rejects.toThrow(
      'No fallback',
    );
    await env.admin.resetDemo();
    expect(await env.publicProvider.listArticles()).toHaveLength(9);
  });
  it('handles storage write failure without reporting a saved edit', async () => {
    const { storage } = setup();
    const env = createDemoEnvironment({
      ...storage,
      setItem() {
        throw Error('full');
      },
    });
    const base = (await env.admin.readSnapshot()).articles[0];
    await expect(
      env.admin.saveArticle({ ...base, title: 'Failed fictional save' }),
    ).rejects.toThrow('not changed');
    expect((await env.admin.readSnapshot()).articles[0].title).toBe(base.title);
  });
  it('never substitutes mock data for an unconfigured production provider', () => {
    const { storage } = setup();
    expect(() => createAppProviders('production', storage)).toThrow(
      'never a production fallback',
    );
  });
});
