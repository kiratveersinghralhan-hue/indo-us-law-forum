import { expect, it } from 'vitest';
import {
  validateManifest,
  prelaunchIssues,
} from '../scripts/content-format.mjs';
it('rejects secrets, ambiguous mappings, implicit updates, publishing and demo imports', () => {
  const manifest = {
    version: 1,
    approval: { reference: 'Written approval', approvedAt: '2026-10-06' },
    categories: [],
    authors: [],
    articles: [],
    cases: [],
    team: [],
  };
  expect(validateManifest(manifest)).toEqual([]);
  expect(
    validateManifest({ ...manifest, password: 'secret' }).length,
  ).toBeGreaterThan(0);
  expect(
    validateManifest({
      ...manifest,
      articles: [
        {
          intent: 'update',
          record: {
            id: crypto.randomUUID(),
            fictional: true,
            status: 'published',
            title: 'Sample',
          },
        },
      ],
    }).length,
  ).toBeGreaterThan(0);
});
it('prelaunch detects provisional branding, missing assets and broken references', () => {
  const problems = prelaunchIssues(
    {
      articles: [
        {
          id: 'a',
          fictional: true,
          status: 'published',
          categoryId: 'missing',
          authorId: 'missing',
        },
      ],
      settings: { featuredArticleIds: ['broken'] },
    },
    { name: 'Organization name pending' },
    [],
  );
  expect(problems.some((s: string) => s.includes('Branding'))).toBe(true);
  expect(
    problems.some((s: string) => s.includes('missing approved image')),
  ).toBe(true);
  expect(problems.some((s: string) => s.includes('Broken featured'))).toBe(
    true,
  );
});

it('approved academic draft imports allow ordinary sample/pending research language and reject malformed/private fields', () => {
  const record = {
    id: crypto.randomUUID(),
    fictional: false,
    status: 'draft',
    order: 0,
    title: 'Sampling methods',
    slug: 'sampling-methods',
    summary: 'A statistical sample and pending policy review.',
    categoryId: crypto.randomUUID(),
    authorId: crypto.randomUUID(),
    coverAssetId: crypto.randomUUID(),
    readingMinutes: 3,
    publicationLabel: '6 October 2026',
    body: [{ type: 'paragraph', text: 'Approved research text.' }],
    artwork: 'institutions',
    featured: false,
    sampleAuthor: 'Approved attribution',
    categoryLabel: 'Methods',
  };
  const manifest = {
    version: 1,
    approval: {
      reference: 'Written client approval',
      approvedAt: '2026-10-06',
    },
    categories: [],
    authors: [],
    articles: [{ intent: 'create', record }],
    cases: [],
    team: [],
  };
  expect(validateManifest(manifest)).toEqual([]);
  expect(
    validateManifest({
      ...manifest,
      articles: [
        { intent: 'create', record: { ...record, contact_email: 'private' } },
      ],
    }).some((s) => s.includes('unknown fields')),
  ).toBe(true);
  expect(
    validateManifest({ ...manifest, articles: [null] }).length,
  ).toBeGreaterThan(0);
  expect(
    validateManifest({
      ...manifest,
      articles: [{ intent: 'create', record: { ...record, title: 7 } }],
    }).length,
  ).toBeGreaterThan(0);
});
