export type BackendConfig = { url: string; key: string };
export function readBackendConfig(
  env: Record<string, string | undefined>,
): BackendConfig | null {
  const mode = env.VITE_DATA_MODE ?? 'mock';
  if (mode === 'mock') return null;
  if (mode !== 'supabase')
    throw Error(
      'VITE_DATA_MODE must be mock or supabase. No fallback mode is permitted.',
    );
  const url = env.VITE_SUPABASE_URL ?? '';
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw Error(
      'Configure a dedicated Supabase URL before selecting backend mode.',
    );
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    !['https:', 'http:'].includes(parsed.protocol) ||
    (parsed.protocol === 'http:' &&
      !['localhost', '127.0.0.1'].includes(parsed.hostname))
  )
    throw Error(
      'Use a HTTPS Supabase origin, or the local development origin.',
    );
  // Publishable credentials only. Legacy JWT keys must explicitly carry anon role.
  let allowed = key.startsWith('sb_publishable_');
  if (!allowed && key.split('.').length === 3) {
    try {
      allowed =
        JSON.parse(
          atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
        ).role === 'anon';
    } catch {
      allowed = false;
    }
  }
  if (!allowed || key.includes('PLACEHOLDER'))
    throw Error(
      'Configure only a browser-safe publishable key. Secret/service-role keys are prohibited.',
    );
  return { url: parsed.origin, key };
}
