// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HeroArtwork } from '../src/motion/hero-artwork';
import { sampleArticles } from '../src/data/mock-data';
import {
  createDemoEnvironment,
  demoStoreKey,
} from '../src/admin/mock-admin-provider';
import { neutralCover } from '../src/data/article-presentation';
vi.mock('../src/motion/webgl-scene', () => ({ default: () => null }));
beforeEach(() =>
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);
it('keeps the selected stable ID across ordering and cover replacement, with corresponding details and route', () => {
  const articles = sampleArticles.slice(0, 3);
  const view = render(<HeroArtwork articles={articles} />, { wrapper });
  view.rerender(
    <HeroArtwork articles={[articles[1], articles[0], articles[2]]} />,
  );
  expect(
    view.container
      .querySelector('.sculpture-stage')
      ?.getAttribute('data-selected-article'),
  ).toBe(articles[0].id);
  fireEvent.click(
    screen.getByRole('button', { name: `Select ${articles[2].title} cover` }),
  );
  const changed = {
    ...articles[2],
    slug: 'changed-slug',
    title: 'Changed title',
    summary: 'Changed excerpt',
    coverUrl: '/actual-updated-cover.png',
  };
  view.rerender(<HeroArtwork articles={[changed, articles[1], articles[0]]} />);
  expect(
    view.container
      .querySelector('.sculpture-stage')
      ?.getAttribute('data-selected-article'),
  ).toBe(changed.id);
  expect(
    screen
      .getByRole('button', { name: `Select ${changed.title} cover` })
      .getAttribute('aria-pressed'),
  ).toBe('true');
  expect(
    view.container.querySelector('.publication-caption')?.textContent,
  ).toContain('Changed excerpt');
  expect(
    screen.getByRole('link', { name: 'Read article' }).getAttribute('href'),
  ).toBe('/articles/changed-slug');
  expect(
    view.container
      .querySelector('.static-volume.is-selected img')
      ?.getAttribute('src'),
  ).toBe(changed.coverUrl);
});
it('caps visible covers, has no duplicate empty covers and uses a neutral cover for real articles without art', () => {
  const view = render(<HeroArtwork articles={[]} />, { wrapper });
  expect(view.container.querySelectorAll('.static-volume')).toHaveLength(1);
  expect(
    view.container.querySelectorAll('.publication-selectors button'),
  ).toHaveLength(0);
  expect(screen.queryByRole('link', { name: 'Read article' })).toBeNull();
  expect(view.container.textContent).toContain(
    'next edition is in preparation',
  );
  view.rerender(
    <HeroArtwork articles={[{ ...sampleArticles[0], fictional: false }]} />,
  );
  expect(view.container.querySelectorAll('.static-volume')).toHaveLength(1);
  expect(
    view.container.querySelector('.static-volume img')?.getAttribute('src'),
  ).toBe(neutralCover);
  expect(
    view.container.querySelector('.publication-caption')?.textContent,
  ).not.toContain('Sample article');
  view.rerender(<HeroArtwork articles={sampleArticles} />);
  expect(
    view.container.querySelectorAll('.publication-selectors button'),
  ).toHaveLength(3);
});
it('saves cover data, refetches shared feature order, removes unpublished/deleted records and rejects draft selections', async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const env = createDemoEnvironment(storage);
  const notified = vi.fn();
  const unsubscribe = env.subscribe(notified);
  const data = await env.admin.readSnapshot();
  const [a, b] = data.articles;
  await env.admin.saveSettings({
    ...data.settings,
    featuredArticleIds: [b.id, a.id],
  });
  const coverUrl = 'data:image/png;base64,iVBORw0KGgo=';
  const changed = await env.admin.saveArticle({
    ...a,
    coverUrl,
    coverAlt: 'Fictional cover test',
  });
  expect(
    (await env.publicProvider.listArticles())
      .filter((r) => r.featured)
      .map((r) => r.id),
  ).toEqual([b.id, a.id]);
  expect((await env.publicProvider.getArticle(a.slug))?.coverUrl).toBe(
    coverUrl,
  );
  expect(notified).toHaveBeenCalled();
  const restored = createDemoEnvironment(storage);
  expect((await restored.publicProvider.getArticle(a.slug))?.coverUrl).toBe(
    coverUrl,
  );
  expect(values.has(demoStoreKey)).toBe(true);
  await env.admin.saveArticle({ ...changed, status: 'draft' });
  expect((await env.admin.readSnapshot()).settings.featuredArticleIds).toEqual([
    b.id,
  ]);
  expect(await env.publicProvider.getArticle(a.slug)).toBeNull();
  await env.admin.deleteRecord('articles', b.id);
  expect(
    (await env.publicProvider.listArticles()).filter((r) => r.featured),
  ).toHaveLength(0);
  const latest = await env.admin.readSnapshot();
  await expect(
    env.admin.saveSettings({ ...latest.settings, featuredArticleIds: [a.id] }),
  ).rejects.toThrow('Only published');
  unsubscribe();
});
