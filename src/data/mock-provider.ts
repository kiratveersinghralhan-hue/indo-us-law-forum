import {
  sampleArticles,
  sampleCases,
  sampleCategories,
  sampleTeam,
} from './mock-data';
import type { ContentProvider } from './types';
import { defaultSiteSettings } from './site-settings';
import { categoryDisplay } from '../config/research-categories';

const copy = <T>(value: T): T => structuredClone(value);
const labelled = <T extends { categoryId: string; categoryLabel: string }>(
  record: T,
): T => ({
  ...record,
  categoryLabel: categoryDisplay(
    sampleCategories.find((c) => c.id === record.categoryId),
  ),
});
export const mockProvider: ContentProvider = {
  getSiteSettings() {
    return copy(defaultSiteSettings);
  },
  async listArticles(query = {}) {
    const search = query.search?.trim().toLocaleLowerCase() ?? '';
    return copy(
      sampleArticles
        .filter(
          (article) =>
            (!query.category || article.categoryId === query.category) &&
            (!search ||
              [
                article.title,
                article.summary,
                article.categoryLabel,
                article.sampleAuthor,
              ]
                .join(' ')
                .toLocaleLowerCase()
                .includes(search)),
        )
        .map(labelled),
    );
  },
  async getArticle(slug) {
    const record = sampleArticles.find((article) => article.slug === slug);
    return record ? copy(labelled(record)) : null;
  },
  async listCases(query = {}) {
    const search = query.search?.trim().toLocaleLowerCase() ?? '';
    return copy(
      sampleCases
        .filter(
          (item) =>
            (!query.category || item.categoryId === query.category) &&
            (!query.kind || item.kind === query.kind) &&
            (!search ||
              [
                item.title,
                item.summary,
                item.reference,
                item.setting,
                ...item.tags,
              ]
                .join(' ')
                .toLocaleLowerCase()
                .includes(search)),
        )
        .map(labelled),
    );
  },
  async getCase(slug) {
    const record = sampleCases.find((item) => item.slug === slug);
    return record ? copy(labelled(record)) : null;
  },
  async listCategories() {
    return copy(sampleCategories);
  },
  async listTeam() {
    return copy(sampleTeam);
  },
};
