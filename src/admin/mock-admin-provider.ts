import type {
  Article,
  ContentProvider,
  ResearchCase,
  TeamProfile,
} from '../data/types';
import type { AdminArticle, AdminProvider, AdminSnapshot } from './types';
import {
  researchCategories,
  categoryDisplay,
} from '../config/research-categories';
import { siteCopy } from '../config/site-copy';
import { createDemoSeed } from './seed';
import {
  validateArticle,
  validateCase,
  validateSettings,
  validateSnapshot,
  validateTeam,
} from './validation';

export const demoStoreKey = 'dilraj-editorial:local-admin-demo:v1';
export type DemoStorage = Pick<Storage, 'getItem' | 'setItem'>;
const clone = <T>(value: T): T => structuredClone(value);
const sorted = <T extends { order: number }>(records: T[]) =>
  [...records].sort((a, b) => a.order - b.order);
const newId = () => crypto.randomUUID();
export function createDemoEnvironment(
  storage: DemoStorage,
  events: Window | null = null,
) {
  let revision = 0;
  const listeners = new Set<() => void>();
  function load(): AdminSnapshot | Error {
    try {
      const saved = storage.getItem(demoStoreKey);
      if (saved === null) return createDemoSeed();
      const value: unknown = JSON.parse(saved);
      validateSnapshot(value);
      if (value.settings.categories.length === 3) {
        value.settings.categories = [
          ...structuredClone(researchCategories),
          ...value.settings.categories.map((c) => ({
            ...c,
            mappingPending: true,
          })),
        ];
        // Only replace the untouched historical default. Preserve all custom content.
        if (
          value.settings.hero.introduction ===
            'An editorial and research platform taking shape. Explore new questions, considered perspectives and a sample archive of ideas.' &&
          value.settings.hero.eyebrow === 'Research · Writing · Perspective' &&
          JSON.stringify(value.settings.hero.lines) ===
            JSON.stringify(['A place for', 'ideas to meet', 'closer inquiry.'])
        )
          value.settings.hero = {
            ...siteCopy.hero,
            lines: [...siteCopy.hero.lines],
          };
      }
      validateSnapshot(value);
      return value;
    } catch {
      return Error(
        'The local demo store is unavailable or invalid. No fallback records were loaded. Retry or use the confirmed Reset demo data action.',
      );
    }
  }
  let cached = load();
  function read() {
    if (cached instanceof Error) throw cached;
    return cached;
  }
  function notify() {
    revision++;
    listeners.forEach((listener) => listener());
  }
  function persisted(next: AdminSnapshot) {
    validateSnapshot(next);
    try {
      const serialized = JSON.stringify(next);
      if (serialized.length > 2_000_000) throw Error();
      storage.setItem(demoStoreKey, serialized);
    } catch {
      throw Error(
        'Local save failed. Demo data was not changed. Browser storage may be blocked or full.',
      );
    }
    cached = next;
    notify();
  }
  function mutation<T>(message: string, action: (next: AdminSnapshot) => T): T {
    // Read the current namespace before each mutation, including another tab's
    // latest edit. This is demo consistency, not database transaction security.
    const fresh = load();
    if (fresh instanceof Error) throw fresh;
    const next = clone(storage.getItem(demoStoreKey) === null ? read() : fresh);
    const result = action(next);
    next.activity.unshift({
      id: newId(),
      at: new Date().toISOString(),
      message,
    });
    next.activity = next.activity.slice(0, 30);
    persisted(next);
    return clone(result);
  }
  function feature(
    next: AdminSnapshot,
    kind: 'articles' | 'cases',
    id: string,
    enabled: boolean,
  ) {
    const field =
      kind === 'articles' ? 'featuredArticleIds' : 'featuredCaseIds';
    const ids = next.settings[field].filter((value) => value !== id);
    next.settings[field] = enabled
      ? next.settings[field].includes(id)
        ? next.settings[field]
        : [...ids, id]
      : ids;
  }
  function put<T extends { id: string; order: number }>(
    records: T[],
    incoming: T,
  ): T {
    const existing = records.findIndex((r) => r.id === incoming.id);
    if (incoming.id && existing < 0)
      throw Error(
        'This demo record was removed. Return to the list before creating another record.',
      );
    const saved = clone({ ...incoming, id: incoming.id || newId() });
    if (existing >= 0) records[existing] = saved;
    else records.push(saved);
    return saved;
  }
  function resolve<T extends { id: string }>(records: T[], id: string): T {
    const item = records.find((r) => r.id === id);
    if (!item)
      throw Error('This demo record no longer exists. Refresh the list.');
    return item;
  }
  const admin: AdminProvider = {
    async readSnapshot() {
      return clone(read());
    },
    async saveArticle(record) {
      return mutation(
        `${record.status === 'published' ? 'Published' : 'Saved draft'} sample article: ${record.title}`,
        (next) => {
          validateArticle(record, next);
          const previous = next.articles.find((a) => a.id === record.id);
          const saved = put(next.articles, {
            ...record,
            submissionId: previous?.submissionId,
          });
          saved.featured = saved.featured && saved.status === 'published';
          feature(next, 'articles', saved.id, saved.featured);
          return saved;
        },
      );
    },
    async saveCase(record) {
      return mutation(
        `${record.status === 'published' ? 'Published' : 'Saved draft'} sample case: ${record.title}`,
        (next) => {
          validateCase(record, next);
          const saved = put(next.cases, record);
          feature(next, 'cases', saved.id, !!saved.featured);
          return saved;
        },
      );
    },
    async saveTeam(record) {
      return mutation(`Saved sample team member: ${record.label}`, (next) => {
        validateTeam(record);
        return put(next.team, record);
      });
    },
    async deleteRecord(kind, id) {
      mutation(
        `Deleted a sample ${kind === 'team' ? 'team member' : kind === 'articles' ? 'article' : 'case'}.`,
        (next) => {
          if (!next[kind].some((record) => record.id === id))
            throw Error('This demo record no longer exists. Refresh the list.');
          if (kind === 'articles') {
            next.articles = next.articles.filter((a) => a.id !== id);
            feature(next, kind, id, false);
          } else if (kind === 'cases') {
            next.cases = next.cases.filter((c) => c.id !== id);
            feature(next, kind, id, false);
          } else next.team = next.team.filter((t) => t.id !== id);
        },
      );
    },
    async reorder(kind, ids) {
      mutation(`Reordered sample ${kind}.`, (next) => {
        if (
          ids.length !== next[kind].length ||
          new Set(ids).size !== ids.length ||
          ids.some((id) => !next[kind].some((r) => r.id === id))
        )
          throw Error('The list changed. Refresh before reordering.');
        next[kind].forEach((r) => {
          r.order = ids.indexOf(r.id);
        });
        if (kind === 'articles')
          next.settings.featuredArticleIds = ids.filter((id) =>
            next.settings.featuredArticleIds.includes(id),
          );
        if (kind === 'cases')
          next.settings.featuredCaseIds = ids.filter((id) =>
            next.settings.featuredCaseIds.includes(id),
          );
      });
    },
    async reviewSubmission(id, status) {
      mutation(
        `${status === 'approved' ? 'Approved' : 'Rejected'} a fictional submission.`,
        (next) => {
          const submission = resolve(next.submissions, id);
          if (submission.convertedArticleId)
            throw Error(
              'This submission has already been converted. Its draft is managed in Articles.',
            );
          if (!['approved', 'rejected'].includes(status))
            throw Error('Unsupported review decision.');
          submission.status = status;
        },
      );
    },
    async convertSubmission(id) {
      const fresh = load();
      if (fresh instanceof Error) throw fresh;
      const submission = resolve(fresh.submissions, id);
      if (submission.convertedArticleId) {
        const draft = fresh.articles.find(
          (a) => a.id === submission.convertedArticleId,
        );
        if (!draft)
          throw Error(
            'This submission was converted once and its article was removed. It cannot be converted again.',
          );
        return clone(draft);
      }
      return mutation(
        'Converted an approved sample submission to an article draft. Nothing was published.',
        (next) => {
          const item = resolve(next.submissions, id);
          if (item.status !== 'approved')
            throw Error('Approve this sample submission before converting it.');
          if (item.convertedArticleId)
            return resolve(next.articles, item.convertedArticleId);
          const base =
            item.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 130) || 'sample-submission';
          let slug = base,
            suffix = 2;
          while (next.articles.some((a) => a.slug === slug))
            slug = `${base}-${suffix++}`;
          const draft: AdminArticle = {
            id: `from-${item.id}`,
            title: item.title,
            slug,
            summary: item.excerpt,
            categoryId: item.categoryId,
            categoryLabel: next.settings.categories.find(
              (c) => c.id === item.categoryId,
            )!.label,
            sampleAuthor: item.author,
            body: clone(item.body),
            status: 'draft',
            order: next.articles.length,
            featured: false,
            artwork: 'institutions',
            publicationLabel: 'Local demo / Date pending',
            readingMinutes: 1,
            fictional: true,
            submissionId: id,
          };
          validateArticle(draft, next);
          next.articles.push(draft);
          item.convertedArticleId = draft.id;
          return draft;
        },
      );
    },
    async saveSettings(settings) {
      mutation('Saved fictional homepage/content settings.', (next) => {
        validateSettings(settings, next);
        next.settings = clone(settings);
        next.articles.forEach((a) => {
          a.featured = settings.featuredArticleIds.includes(a.id);
        });
        next.cases.forEach((c) => {
          c.featured = settings.featuredCaseIds.includes(c.id);
        });
      });
    },
    async resetDemo() {
      persisted(createDemoSeed());
    },
  };
  const categoryLabel = (id: string) =>
    categoryDisplay(read().settings.categories.find((c) => c.id === id));
  const publicArticles = () => {
    const snapshot = read();
    const featured = snapshot.settings.featuredArticleIds;
    return sorted(snapshot.articles)
      .filter((a) => a.status === 'published')
      .sort((a, b) => {
        const rank = (id: string) =>
          featured.includes(id) ? featured.indexOf(id) : -1;
        return rank(a.id) < 0
          ? rank(b.id) < 0
            ? 0
            : 1
          : rank(b.id) < 0
            ? -1
            : rank(a.id) - rank(b.id);
      })
      .map((a): Article => ({
        id: a.id,
        coverUrl: a.coverUrl,
        coverAlt: a.coverAlt,
        fictional: true,
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        categoryId: a.categoryId,
        categoryLabel: categoryLabel(a.categoryId),
        readingMinutes: a.readingMinutes,
        sampleAuthor: a.sampleAuthor,
        featured: featured.includes(a.id),
        artwork: a.artwork,
        publicationLabel: a.publicationLabel,
        body: a.body,
      }));
  };
  const publicCases = () => {
    const snapshot = read();
    const featured = snapshot.settings.featuredCaseIds;
    return sorted(snapshot.cases)
      .filter((c) => c.status === 'published')
      .sort((a, b) => {
        const rank = (id: string) =>
          featured.includes(id) ? featured.indexOf(id) : 1000;
        return rank(a.id) - rank(b.id);
      })
      .map((c): ResearchCase => ({
        slug: c.slug,
        title: c.title,
        summary: c.summary,
        categoryId: c.categoryId,
        categoryLabel: categoryLabel(c.categoryId),
        featured: featured.includes(c.id),
        reference: c.reference,
        kind: c.kind,
        setting: c.setting,
        tags: c.tags,
        dateLabel: c.dateLabel,
        sourceNote: c.sourceNote,
        body: c.body,
        supportingDocuments: c.supportingDocuments,
      }));
  };
  const publicProvider: ContentProvider = {
    getSiteSettings() {
      const { hero, sections, contact, socialLinks } = read().settings;
      return clone({ hero, sections, contact, socialLinks });
    },
    async listArticles(query = {}) {
      const search = query.search?.trim().toLowerCase() ?? '';
      return clone(
        publicArticles().filter(
          (a) =>
            (!query.category || a.categoryId === query.category) &&
            (!search ||
              [a.title, a.summary, a.sampleAuthor, a.categoryLabel]
                .join(' ')
                .toLowerCase()
                .includes(search)),
        ),
      );
    },
    async getArticle(slug) {
      return clone(publicArticles().find((a) => a.slug === slug) ?? null);
    },
    async listCases(query = {}) {
      const search = query.search?.trim().toLowerCase() ?? '';
      return clone(
        publicCases().filter(
          (c) =>
            (!query.category || c.categoryId === query.category) &&
            (!query.kind || c.kind === query.kind) &&
            (!search ||
              [c.title, c.summary, c.reference, c.setting, ...c.tags]
                .join(' ')
                .toLowerCase()
                .includes(search)),
        ),
      );
    },
    async getCase(slug) {
      return clone(publicCases().find((c) => c.slug === slug) ?? null);
    },
    async listTeam() {
      return clone(
        sorted(read().team).map((t): TeamProfile => ({
          id: t.id,
          label: t.label,
          role: t.role,
          description: t.description,
          artwork: t.artwork,
          links: t.links,
        })),
      );
    },
    async listCategories() {
      return clone(read().settings.categories);
    },
  };
  function changed(event: StorageEvent) {
    if (event.key === demoStoreKey || event.key === null) {
      cached = load();
      notify();
    }
  }
  return {
    admin,
    publicProvider,
    getRevision: () => revision,
    subscribe(listener: () => void) {
      if (listeners.size === 0) events?.addEventListener('storage', changed);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) events?.removeEventListener('storage', changed);
      };
    },
    refresh() {
      cached = load();
      notify();
    },
  };
}
export type DemoEnvironment = ReturnType<typeof createDemoEnvironment>;
export function createAppProviders(
  mode: 'local-demo' | 'production',
  storage: DemoStorage,
  events: Window | null = null,
) {
  if (mode !== 'local-demo')
    throw Error(
      'Production providers are not configured. Local demo is never a production fallback.',
    );
  return createDemoEnvironment(storage, events);
}
