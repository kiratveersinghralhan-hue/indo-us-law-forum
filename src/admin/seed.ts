import {
  sampleArticles,
  sampleCases,
  sampleCategories,
  sampleTeam,
} from '../data/mock-data';
import { defaultSiteSettings } from '../data/site-settings';
import type { AdminSnapshot } from './types';

export function createDemoSeed(): AdminSnapshot {
  const articles = sampleArticles.map((article, order) => ({
    ...structuredClone(article),
    id: `article-${article.slug}`,
    order,
    fictional: true as const,
    status: 'published' as const,
  }));
  const cases = sampleCases.map((item, order) => ({
    ...structuredClone(item),
    id: `case-${item.slug}`,
    order,
    fictional: true as const,
    status: 'published' as const,
    featured: order < 3,
    supportingDocuments: [],
  }));
  return {
    version: 1,
    articles: [
      ...articles,
      {
        ...structuredClone(articles[0]),
        id: 'sample-draft-article',
        slug: 'sample-draft-awaiting-review',
        title: 'Sample draft awaiting review',
        status: 'draft',
        featured: false,
        order: articles.length,
      },
    ],
    cases: [
      ...cases,
      {
        ...structuredClone(cases[0]),
        id: 'sample-draft-case',
        slug: 'sample-case-awaiting-context',
        title: 'Sample case awaiting context',
        status: 'draft',
        featured: false,
        reference: 'SAMPLE–DRAFT',
        order: cases.length,
      },
    ],
    team: sampleTeam.map((item, order) => ({
      ...structuredClone(item),
      order,
      fictional: true,
      links: [],
    })),
    submissions: [
      {
        id: 'submission-reading-room',
        title: 'A sample reading-room question',
        excerpt: 'Fictional submission for testing editorial review.',
        categoryId: 'communities',
        author: 'Sample submitter A',
        body: [
          {
            type: 'paragraph',
            text: 'Fictional outline: how could a shared reading room be described?',
          },
        ],
        status: 'pending',
        fictional: true,
      },
      {
        id: 'submission-source-context',
        title: 'Sources and context — sample note',
        excerpt: 'A second fictional submission for approval/rejection review.',
        categoryId: 'institutions',
        author: 'Sample submitter B',
        body: [
          {
            type: 'note',
            text: 'Sample content only; no verified findings or real submitter.',
          },
        ],
        status: 'pending',
        fictional: true,
      },
    ],
    settings: {
      ...structuredClone(defaultSiteSettings),
      categories: structuredClone(sampleCategories),
      fictional: true,
      featuredArticleIds: articles.filter((a) => a.featured).map((a) => a.id),
      featuredCaseIds: cases.filter((c) => c.featured).map((c) => c.id),
    },
    activity: [
      {
        id: 'initial-demo',
        at: new Date().toISOString(),
        message: 'Initialized fictional local demo records.',
      },
    ],
  };
}
