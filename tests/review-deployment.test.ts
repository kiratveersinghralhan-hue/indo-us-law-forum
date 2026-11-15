import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The JS launcher helpers run unchanged in Node; no Supabase client or network.
const moduleURL = new URL('../scripts/review-config.mjs', import.meta.url).href;
const { reviewBackend, reviewRuntime } = await import(moduleURL);
const fixture = () => ({
  VITE_DATA_MODE: 'supabase',
  VITE_SUPABASE_URL: 'https://erwliwgbjlutczmtqoss.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_TEST_ONLY_000000000000',
  SITE_INDEXABLE: 'false',
  RENDER_EXTERNAL_URL: 'https://test-only-review.onrender.com',
  PORT: '10000',
});

it('starts the existing SSR implementation on the provider port/interface with a fixed noindex origin', () => {
  expect(reviewRuntime(fixture())).toMatchObject({
    origin: 'https://test-only-review.onrender.com',
    port: 10000,
    host: '0.0.0.0',
    indexable: false,
  });
  const local = {
    ...fixture(),
    RENDER_EXTERNAL_URL: undefined,
    PUBLIC_SITE_ORIGIN: 'http://127.0.0.1:5194',
    PORT: '5194',
  };
  expect(reviewRuntime(local)).toMatchObject({
    origin: local.PUBLIC_SITE_ORIGIN,
    port: 5194,
  });
});

it('rejects mock mode, unrelated backends, privileged/placeholder keys and unexpected browser env without leaking values', () => {
  for (const change of [
    { VITE_DATA_MODE: 'mock' },
    { VITE_SUPABASE_URL: 'https://other.supabase.co' },
    { VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_DO_NOT_DISPLAY_000000000000' },
    {
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_PLACEHOLDER_000000000000',
    },
    { VITE_SERVICE_ROLE_KEY: 'DO_NOT_DISPLAY_000000000000' },
    { SITE_INDEXABLE: 'true' },
  ]) {
    expect(() => reviewBackend({ ...fixture(), ...change })).toThrow();
    try {
      reviewBackend({ ...fixture(), ...change });
    } catch (error) {
      expect(String(error)).not.toMatch(/DO_NOT_DISPLAY|000000000000/);
    }
  }
  expect(reviewBackend({ ...fixture(), RENDER_EXTERNAL_URL: undefined }).url).toBe(
    fixture().VITE_SUPABASE_URL,
  );
});

it('rejects insecure/mismatched origins, URL credentials/paths and invalid provider ports', () => {
  for (const change of [
    { PUBLIC_SITE_ORIGIN: 'https://unrelated.example' },
    { RENDER_EXTERNAL_URL: 'http://test-only-review.onrender.com' },
    {
      RENDER_EXTERNAL_URL:
        'https://user:password@test-only-review.onrender.com',
    },
    { RENDER_EXTERNAL_URL: 'https://test-only-review.onrender.com/path' },
    {
      RENDER_EXTERNAL_URL:
        'https://test-only-review.onrender.com?token=private',
    },
    {
      RENDER_EXTERNAL_URL: 'https://test-only-review.onrender.com.evil.invalid',
    },
    { RENDER_EXTERNAL_URL: '' },
    { PORT: '0' },
    { PORT: '65536' },
    { PORT: 'not-a-port' },
    { PORT: '1.5' },
  ])
    expect(() => reviewRuntime({ ...fixture(), ...change })).toThrow();
});

it('keeps the proposed service free/manual and uses the guarded SSR commands without infrastructure extras', () => {
  const manifest = readFileSync('render.yaml', 'utf8');
  expect(manifest).toMatch(/plan: free/);
  expect(manifest).toMatch(/autoDeployTrigger: 'off'/);
  expect(manifest).toMatch(/branch: main/);
  expect(manifest).toMatch(/npm ci --include=dev && npm run build:review/);
  expect(manifest).toMatch(/startCommand: npm run start:review/);
  expect(manifest).toMatch(/key: SITE_INDEXABLE\s+value: "false"/);
  expect(manifest).toMatch(/key: VITE_SUPABASE_PUBLISHABLE_KEY\s+sync: false/);
  expect(manifest).not.toMatch(
    /^\s*(databases|domains|disk|preDeployCommand|initialDeployHook|headers|routes):/m,
  );
  expect(manifest).not.toMatch(/sb_publishable_|sb_secret_|service_role/);
});
