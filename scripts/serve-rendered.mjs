import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* Explicit process env can supply configuration. */
}
const { publicEnvironment, createPublicationServer } = await import(
  pathToFileURL(resolve('dist-server/render.js')).href
);
const origin = process.env.PUBLIC_SITE_ORIGIN ?? 'http://127.0.0.1:5190';
const configuredOrigin = new URL(origin);
if (
  !['http:', 'https:'].includes(configuredOrigin.protocol) ||
  configuredOrigin.pathname !== '/' ||
  configuredOrigin.search ||
  configuredOrigin.hash ||
  configuredOrigin.username ||
  configuredOrigin.password
)
  throw Error('PUBLIC_SITE_ORIGIN must be a plain absolute origin.');
const indexable =
  process.env.SITE_INDEXABLE === 'true' &&
  configuredOrigin.protocol === 'https:';
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (
  process.env.VITE_DATA_MODE !== 'supabase' ||
  url !== 'https://erwliwgbjlutczmtqoss.supabase.co' ||
  !key?.startsWith('sb_publishable_')
)
  throw Error(
    'Rendered preview requires explicit Supabase mode and the dedicated publishable configuration.',
  );
const template = await readFile('dist/index.html', 'utf8');
const root = resolve('dist');
const server = createPublicationServer({
  origin: configuredOrigin.origin,
  root,
  template,
  indexable,
  environment: () => publicEnvironment(url, key),
});
server.listen(Number(process.env.PORT ?? 5190), '127.0.0.1', () =>
  console.log('Local rendered preview ready at ' + origin),
);
