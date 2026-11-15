import { describe, expect, it } from 'vitest';
import { readBackendConfig } from '../src/backend/config';
import { validateUpload } from '../src/backend/uploads';
import {
  validateIntake,
  validateAttachment,
} from '../supabase/functions/_shared/intake-validation';
import { fromDocument } from '../src/backend/editor-format';

describe('Explicit backend boundaries (not database/RLS proof)', () => {
  it('defaults to explicit demo and rejects unknown modes or missing backend configuration', () => {
    expect(readBackendConfig({})).toBeNull();
    expect(() => readBackendConfig({ VITE_DATA_MODE: 'automatic' })).toThrow();
    expect(() => readBackendConfig({ VITE_DATA_MODE: 'supabase' })).toThrow();
  });
  it('rejects secret keys and legacy service-role JWTs', () => {
    const env = {
      VITE_DATA_MODE: 'supabase',
      VITE_SUPABASE_URL: 'https://dedicated.example.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_forbidden',
    };
    expect(() => readBackendConfig(env)).toThrow();
    const key = `x.${btoa(JSON.stringify({ role: 'service_role' }))}.x`;
    expect(() =>
      readBackendConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: key }),
    ).toThrow();
    expect(
      readBackendConfig({
        ...env,
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
      })?.url,
    ).toBe('https://dedicated.example.test');
  });
  it('checks file signatures and bounded sizes independently of extensions', async () => {
    const file = (text: string, type: string, size = 10) => ({
      size,
      type,
      arrayBuffer: async () => new TextEncoder().encode(text).buffer,
    });
    await expect(
      validateUpload(file('%PDF-1.7', 'application/pdf'), 'document'),
    ).resolves.toBeUndefined();
    await expect(
      validateUpload(file('<script>', 'image/png'), 'image'),
    ).rejects.toThrow();
    await expect(
      validateUpload(
        file('%PDF-', 'application/pdf', 11 * 1024 * 1024),
        'document',
      ),
    ).rejects.toThrow();
    expect(() =>
      validateAttachment(
        new TextEncoder().encode('not a pdf'),
        'application/pdf',
      ),
    ).toThrow();
  });
  it('rejects invalid intake, honeypots and early submissions; preserves structured text', () => {
    const input = {
      requestId: crypto.randomUUID(),
      categoryId: crypto.randomUUID(),
      title: 'Title',
      excerpt: 'Summary',
      author: 'Author',
      email: 'test@example.invalid',
      outline: '<script>alert(1)</script>',
      token: 'test-token',
      website: '',
      elapsed: '5000',
    };
    expect(validateIntake(input).body[0].text).toBe(input.outline);
    expect(() => validateIntake({ ...input, website: 'bot' })).toThrow();
    expect(() => validateIntake({ ...input, elapsed: '0' })).toThrow();
    expect(() => validateIntake({ ...input, email: 'bad' })).toThrow();
    expect(() =>
      validateIntake({ ...input, categoryId: 'arbitrary' }),
    ).toThrow();
  });
  it('serializes limited editor nodes to safely rendered blocks without HTML', () => {
    expect(
      fromDocument({
        type: 'doc',
        content: [
          { type: 'heading', content: [{ type: 'text', text: 'Heading' }] },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Point' }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toEqual([
      { type: 'heading', text: 'Heading' },
      { type: 'list', items: ['Point'] },
    ]);
  });
});
