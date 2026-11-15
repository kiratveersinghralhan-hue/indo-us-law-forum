const dedicatedURL = 'https://erwliwgbjlutczmtqoss.supabase.co';

// No dotenv loading: hosted configuration must be explicit, never copied wholesale
// from a developer environment. Messages deliberately omit credential values.
export function reviewBackend(env) {
  if (
    env.VITE_DATA_MODE !== 'supabase' ||
    env.VITE_SUPABASE_URL !== dedicatedURL ||
    !/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(
      env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
    ) ||
    /PLACEHOLDER|YOUR_/i.test(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')
  )
    throw Error(
      'Review requires Supabase mode and the dedicated publishable configuration.',
    );
  const publicNames = new Set([
    'VITE_DATA_MODE',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
  ]);
  if (
    Object.keys(env).some(
      (name) => name.startsWith('VITE_') && !publicNames.has(name),
    )
  )
    throw Error(
      'Unexpected public build variable. Review the browser environment allowlist.',
    );
  if (env.SITE_INDEXABLE && env.SITE_INDEXABLE !== 'false')
    throw Error('Review indexing must stay disabled.');
  return { url: dedicatedURL, key: env.VITE_SUPABASE_PUBLISHABLE_KEY };
}

export function reviewRuntime(env) {
  const backend = reviewBackend(env);
  const origin = env.PUBLIC_SITE_ORIGIN ?? env.RENDER_EXTERNAL_URL;
  if (!origin)
    throw Error(
      "Set the explicit review origin or use Render's temporary URL.",
    );
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    throw Error('Review origin must be a plain absolute URL.');
  }
  const loopback = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    (parsed.protocol !== 'https:' && !loopback) ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash ||
    parsed.username ||
    parsed.password ||
    (env.RENDER_EXTERNAL_URL &&
      (parsed.protocol !== 'https:' ||
        parsed.origin !== env.RENDER_EXTERNAL_URL ||
        !/^[a-z0-9-]+\.onrender\.com$/.test(parsed.hostname)))
  )
    throw Error(
      'Review requires a plain HTTPS origin matching the temporary Render URL.',
    );
  const port = Number(env.PORT ?? 10000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error('PORT must be an integer from 1 to 65535.');
  return {
    ...backend,
    origin: parsed.origin,
    port,
    host: '0.0.0.0',
    indexable: false,
  };
}
