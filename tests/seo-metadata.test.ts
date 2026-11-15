// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { setPageMetadata } from '../src/config/seo';

it('keeps SPA metadata aligned with the configured canonical origin and removes a previous article image', () => {
  document.head.innerHTML =
    '<link rel="canonical" href="https://publication.example.invalid/articles/old"><meta property="og:image" content="https://publication.example.invalid/media/old">';
  setPageMetadata('TEST ONLY article', 'TEST ONLY summary', {
    type: 'article',
    imagePath: '/media/test-id',
  });
  expect(
    document.querySelector('meta[property="og:type"]')?.getAttribute('content'),
  ).toBe('article');
  expect(
    document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute('content'),
  ).toBe('https://publication.example.invalid/media/test-id');
  setPageMetadata('TEST ONLY case', 'TEST ONLY case summary');
  expect(
    document.querySelector('meta[property="og:type"]')?.getAttribute('content'),
  ).toBe('website');
  expect(document.querySelector('meta[property="og:image"]')).toBeNull();
  expect(
    document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
  ).toBe(document.querySelector('link[rel="canonical"]')?.getAttribute('href'));
});

it('does not invent a canonical production domain in ordinary Vite mode', () => {
  document.head.innerHTML = '';
  setPageMetadata('TEST ONLY preview');
  expect(document.querySelector('link[rel="canonical"]')).toBeNull();
});
