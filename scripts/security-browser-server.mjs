import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createPublicationServer } from '../dist-server/render.js';

// Production renderer/bundles, isolated read-only SSR fixtures. No Supabase client
// is constructed here; browser tests intercept the dedicated origin entirely.
const settings = {
  hero: {
    eyebrow: 'MOCK HTTP TEST ONLY',
    lines: ['Research', 'across', 'borders'],
    introduction: 'Local security verification only.',
  },
  sections: [],
  contact: { email: '', address: '' },
  socialLinks: [],
};
const environment = {
  publicProvider: {
    getSiteSettings: () => settings,
    listCategories: async () => [],
    listTeam: async () => [],
    listArticles: async () => [],
    getArticle: async () => null,
    listCases: async () => [],
    getCase: async () => null,
  },
  backend: {},
  admin: {},
  subscribe: () => () => {},
  getRevision: () => 0,
  refresh: () => {},
  dispose: () => {},
};
const server = createPublicationServer({
  origin: 'http://127.0.0.1:5193',
  root: resolve('dist'),
  template: await readFile('dist/index.html', 'utf8'),
  environment: async () => environment,
});
server.listen(5193, '127.0.0.1', () =>
  console.log('Isolated security-header browser fixture ready.'),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
