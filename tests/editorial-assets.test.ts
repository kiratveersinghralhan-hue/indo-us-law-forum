// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { editorialMedia } from '../src/config/media';

describe('bundled editorial artwork', () => {
  it('each registered SVG parses without errors and reserves positive dimensions', () => {
    for (const key of Object.keys(editorialMedia)) {
      const source = readFileSync(`public/artwork/${key}.svg`, 'utf8');
      const document = new DOMParser().parseFromString(source, 'image/svg+xml');
      expect(document.querySelector('parsererror'), key).toBeNull();
      expect(document.documentElement.tagName, key).toBe('svg');
      expect(
        Number(document.documentElement.getAttribute('width')),
        key,
      ).toBeGreaterThan(0);
      expect(
        Number(document.documentElement.getAttribute('height')),
        key,
      ).toBeGreaterThan(0);
      expect(
        document.querySelector('image, script, foreignObject'),
        key,
      ).toBeNull();
    }
  });
});
