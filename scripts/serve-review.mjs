import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { reviewRuntime } from './review-config.mjs';

const config = reviewRuntime(process.env);
const { publicEnvironment, createPublicationServer } = await import(
  pathToFileURL(resolve('dist-server/render.js')).href
);
const server = createPublicationServer({
  origin: config.origin,
  root: resolve('dist'),
  template: await readFile('dist/index.html', 'utf8'),
  indexable: false,
  environment: () => publicEnvironment(config.url, config.key),
});
server.listen(config.port, config.host, () =>
  console.log('Noindex SSR review server ready.'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
