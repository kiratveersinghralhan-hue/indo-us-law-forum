import { randomBytes } from 'node:crypto';

export const dedicatedSupabaseOrigin =
  'https://erwliwgbjlutczmtqoss.supabase.co';

export function responseSecurity(supabaseOrigin = dedicatedSupabaseOrigin) {
  const backend = new URL(supabaseOrigin);
  if (
    backend.origin !== supabaseOrigin ||
    (backend.origin !== dedicatedSupabaseOrigin &&
      !(
        backend.protocol === 'http:' &&
        ['127.0.0.1', 'localhost'].includes(backend.hostname)
      ))
  )
    throw Error(
      'Security policy requires the dedicated Supabase or an explicit loopback test origin.',
    );
  const nonce = randomBytes(18).toString('base64');
  const policy = [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}'`,
    // Existing SSR style attributes and CSS motion variables require this;
    // style elements still require a nonce or a same-origin stylesheet.
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: blob: ${backend.origin}`,
    "font-src 'self'",
    `connect-src 'self' ${backend.origin}`,
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "worker-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; ');
  return {
    nonce,
    headers: {
      'Content-Security-Policy': policy,
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy':
        'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    },
  };
}
