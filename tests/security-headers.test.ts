import { expect, it } from 'vitest';
import { responseSecurity } from '../src/server/security-headers';

it('limits backend exceptions to the exact dedicated project or explicit loopback tests', () => {
  expect(
    responseSecurity('http://127.0.0.1:54321').headers[
      'Content-Security-Policy'
    ],
  ).toContain("connect-src 'self' http://127.0.0.1:54321");
  for (const origin of [
    'https://other.supabase.co',
    'https://erwliwgbjlutczmtqoss.supabase.co/path',
    'http://example.org',
    'https://user:password@erwliwgbjlutczmtqoss.supabase.co',
  ])
    expect(() => responseSecurity(origin)).toThrow();
  const policy = responseSecurity().headers['Content-Security-Policy'];
  expect(policy).not.toMatch(/unsafe-eval|wasm-unsafe-eval|\*|wss:|https:;/);
  expect(
    policy.split('; ').find((value) => value.startsWith('script-src ')),
  ).not.toContain('unsafe-inline');
  expect(
    policy.split('; ').find((value) => value.startsWith('style-src ')),
  ).not.toContain('unsafe-inline');
  expect(policy).toContain(
    "img-src 'self' data: blob: https://erwliwgbjlutczmtqoss.supabase.co",
  );
});
