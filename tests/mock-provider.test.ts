import { describe, expect, it } from 'vitest';
import { mockProvider } from '../src/data/mock-provider';

describe('public reading and repository boundary', () => {
  it('searches article titles, excerpts, categories and attribution case-insensitively with combined filters', async () => {
    expect(
      (await mockProvider.listArticles({ search: 'LIBRARY' })).map(
        (item) => item.slug,
      ),
    ).toEqual(['a-library-as-a-shared-space']);
    expect(
      await mockProvider.listArticles({
        search: 'library',
        category: 'environment',
      }),
    ).toHaveLength(0);
    expect(
      await mockProvider.listArticles({ search: 'Sample contributor A' }),
    ).toHaveLength(2);
    expect(await mockProvider.listArticles({ search: '    ' })).toHaveLength(9);
  });
  it('returns independent sample records and handles unknown detail slugs without inventing content', async () => {
    const first = await mockProvider.listArticles();
    first[0].title = 'Mutated';
    expect((await mockProvider.listArticles())[0].title).not.toBe('Mutated');
    expect(await mockProvider.getArticle('unknown')).toBeNull();
    expect(await mockProvider.getCase('unknown')).toBeNull();
    expect(
      (await mockProvider.listTeam()).every(
        (profile) =>
          profile.artwork === 'avatar' &&
          profile.label.startsWith('Sample profile'),
      ),
    ).toBe(true);
  });
});
