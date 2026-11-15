import { expect, it } from 'vitest';
import { fromDocument } from '../src/backend/editor-format';
import { blockErrors, validateBlocks } from '../src/admin/validation';
import { validateBackendContent } from '../src/backend/article-validation';
import { actionError } from '../src/backend/action-errors';
import type { AdminArticle } from '../src/admin/types';

const article = {
  title: 'Test',
  summary: 'Summary',
  slug: 'test',
  categoryId: 'c',
  order: 0,
  status: 'draft',
  body: [{ type: 'paragraph', text: 'Text' }],
  sampleAuthor: '',
} as AdminArticle;
it('locates empty bullets between meaningful paragraphs without discarding any list or paragraph', () => {
  const body = fromDocument({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] },
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      },
      { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
      { type: 'paragraph' },
    ],
  });
  expect(body).toEqual([
    { type: 'paragraph', text: 'Intro' },
    { type: 'list', items: [''] },
    { type: 'paragraph', text: 'After' },
  ]);
  expect(blockErrors(body)).toEqual({
    'body.1.items.0':
      'Content block 2, bullet 1 is empty. Add text or remove this bullet.',
  });
});
it('ignores only trailing empty paragraphs; preserves interior empties and empty headings/lists', () => {
  const body = fromDocument({
    content: [
      { type: 'paragraph' },
      { type: 'paragraph', content: [{ type: 'text', text: 'Text' }] },
      { type: 'heading' },
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      },
      { type: 'paragraph' },
    ],
  });
  expect(body).toHaveLength(4);
  expect(Object.keys(blockErrors(body))).toEqual([
    'body.0',
    'body.2',
    'body.3.items.0',
  ]);
  expect(fromDocument({ content: [{ type: 'paragraph' }] })).toEqual([]);
});
it('accepts valid bullet/paragraph content; reports every actual length using PostgreSQL character semantics', () => {
  expect(() =>
    validateBlocks([
      { type: 'list', items: ['One', 'Two'] },
      { type: 'paragraph', text: 'Following paragraph' },
    ]),
  ).not.toThrow();
  expect(() =>
    validateBlocks([{ type: 'paragraph', text: 'Paragraph only' }]),
  ).not.toThrow();
  expect(
    blockErrors([{ type: 'list', items: ['x'.repeat(6001), ''] }]),
  ).toEqual({
    'body.0.items.0':
      'Content block 1, bullet 1 has 6001 characters; the limit is 6000. Shorten or split this bullet.',
    'body.0.items.1':
      'Content block 1, bullet 2 is empty. Add text or remove this bullet.',
  });
  expect(() =>
    validateBlocks([{ type: 'paragraph', text: '🙂'.repeat(6000) }]),
  ).not.toThrow();
});
it('preserves multiple paragraphs and nested list text in a bullet', () => {
  expect(
    fromDocument({
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ text: 'One' }] },
                { type: 'paragraph', content: [{ text: 'Two' }] },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        { type: 'paragraph', content: [{ text: 'Nested' }] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  ).toEqual([{ type: 'list', items: ['One\n\nTwo\n\nNested'] }]);
});
it('drafts need no author/cover; publishing requires both and identifies title/slug/excerpt separately', () => {
  expect(() => validateBackendContent(article)).not.toThrow();
  expect(() =>
    validateBackendContent({ ...article, status: 'published' }),
  ).toThrow('Choose an approved author');
  try {
    validateBackendContent({
      ...article,
      title: '',
      slug: 'Invalid Slug',
      summary: 's'.repeat(1201),
    });
  } catch (error) {
    expect((error as { fields: Record<string, string> }).fields).toMatchObject({
      title: expect.stringContaining('empty'),
      slug: expect.stringContaining('lowercase'),
      summary: expect.stringContaining('1201'),
    });
  }
});
it('maps permission/network/storage/persistence failures without reflecting raw secrets or responses', () => {
  expect(
    actionError({ status: 403, message: 'sensitive jwt=secret' }, 'storage')
      .message,
  ).toContain('active editorial access');
  expect(
    actionError({ status: 401, message: 'secret' }, 'storage').message,
  ).toContain('session');
  expect(
    actionError({ message: 'Failed to fetch token=secret' }, 'storage').message,
  ).toContain('connection');
  expect(
    actionError({ status: 500, message: 'secret' }, 'asset-reference').message,
  ).toContain('file was uploaded');
  expect(
    actionError({ status: 500, message: 'secret' }, 'preview').message,
  ).toContain('will not upload another copy');
  expect(
    actionError({ code: '23505', message: 'secret' }, 'save').message,
  ).toContain('slug');
});
