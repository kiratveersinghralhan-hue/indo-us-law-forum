import type {
  Article,
  Category,
  ContentBlock,
  ResearchCase,
  TeamProfile,
} from './types';

import { researchCategories } from '../config/research-categories';

// Fictional records; legacy categories are retained without guessing a mapping.
export const legacyCategories: Category[] = [
  {
    id: 'institutions',
    label: 'Institutions',
    description:
      'Sample focus: public decisions, local systems and accountability.',
  },
  {
    id: 'communities',
    label: 'Communities',
    description:
      'Sample focus: shared spaces, participation and everyday experience.',
  },
  {
    id: 'environment',
    label: 'Environment',
    description:
      'Sample focus: adaptation, resources and the places we inhabit.',
  },
];
export const sampleCategories: Category[] = [
  ...structuredClone(researchCategories),
  ...legacyCategories.map((c) => ({ ...c, mappingPending: true })),
];

const sampleBody = (question: string): ContentBlock[] => [
  {
    type: 'note',
    text: 'Sample content for layout review. This is not a published study and contains no verified findings.',
  },
  { type: 'paragraph', text: question },
  { type: 'heading', text: 'A starting point for inquiry' },
  {
    type: 'paragraph',
    text: 'A useful research question makes its assumptions visible. This sample demonstrates the reading experience for a longer article, with room for context, methods and discussion. Final research and editorial standards will be supplied by the organization.',
  },
  { type: 'heading', text: 'What a complete account could include' },
  {
    type: 'list',
    items: [
      'The question and the context in which it arose.',
      'A clear description of sources, methods and limitations.',
      'A discussion that distinguishes evidence from interpretation.',
    ],
  },
  {
    type: 'paragraph',
    text: 'This prototype uses structured text blocks. Source citations, approved media and publication metadata can be added once the content requirements are confirmed.',
  },
];

export const sampleArticles: Article[] = [
  {
    id: 'article-reading-the-spaces-between-decisions',
    slug: 'reading-the-spaces-between-decisions',
    title: 'Reading the spaces between public decisions',
    summary:
      'A sample editorial on the records, routines and everyday spaces that could help us understand how institutions work.',
    categoryId: 'institutions',
    categoryLabel: 'Institutions',
    readingMinutes: 6,
    sampleAuthor: 'Sample contributor A',
    featured: true,
    artwork: 'institutions',
    publicationLabel: 'Sample edition / Date pending',
    body: sampleBody(
      'How might we look beyond a final decision to understand the process that shaped it?',
    ),
  },
  {
    id: 'article-a-library-as-a-shared-space',
    slug: 'a-library-as-a-shared-space',
    title: 'A library as a shared space',
    summary:
      'A sample inquiry into the relationship between public places and community participation.',
    categoryId: 'communities',
    categoryLabel: 'Communities',
    readingMinutes: 4,
    sampleAuthor: 'Sample contributor B',
    featured: true,
    artwork: 'communities',
    publicationLabel: 'Sample edition / Date pending',
    body: sampleBody(
      'What questions could a shared library raise about access, belonging and the use of public space?',
    ),
  },
  {
    id: 'article-mapping-neighbourhood-shade',
    slug: 'mapping-neighbourhood-shade',
    title: 'Mapping neighbourhood shade',
    summary:
      'A sample research outline for observing the streets and spaces people use during warmer months.',
    categoryId: 'environment',
    categoryLabel: 'Environment',
    readingMinutes: 5,
    sampleAuthor: 'Sample contributor C',
    featured: true,
    artwork: 'environment',
    publicationLabel: 'Sample edition / Date pending',
    body: sampleBody(
      'How could a neighbourhood observation exercise document shade without overstating what a small sample can tell us?',
    ),
  },
  {
    id: 'article-the-language-of-public-records',
    slug: 'the-language-of-public-records',
    title: 'The language of public records',
    summary:
      'A sample reading note on clarity, context and the questions an archive leaves open.',
    categoryId: 'institutions',
    categoryLabel: 'Institutions',
    readingMinutes: 7,
    sampleAuthor: 'Sample contributor A',
    featured: false,
    artwork: 'archive',
    publicationLabel: 'Sample edition / Date pending',
    body: sampleBody(
      'How does the language of a public record influence the questions a reader can ask?',
    ),
  },
  {
    id: 'article-listening-before-measuring',
    slug: 'listening-before-measuring',
    title: 'Listening before measuring',
    summary:
      'A sample methods note on framing questions with the people a study would involve.',
    categoryId: 'communities',
    categoryLabel: 'Communities',
    readingMinutes: 3,
    sampleAuthor: 'Sample contributor B',
    featured: false,
    artwork: 'communities',
    publicationLabel: 'Sample edition / Date pending',
    body: sampleBody(
      'What could a listening exercise contribute before a survey is designed?',
    ),
  },
  ...researchCategories.map((category, index): Article => ({
    id: `article-sample-${category.id}`,
    slug: `sample-${category.id}`,
    title: `Research outline ${index + 1}: ${category.label}`,
    summary:
      'Sample article template for layout and category review. No legal findings, authorities or outcomes are asserted.',
    categoryId: category.id,
    categoryLabel: category.label,
    readingMinutes: 3,
    sampleAuthor: 'Sample student researcher',
    featured: false,
    fictional: true,
    artwork: (
      ['institutions', 'communities', 'environment', 'archive'] as const
    )[index],
    publicationLabel: 'Sample template / Not published research',
    body: sampleBody(
      'An approved research question, sources and analysis will be supplied by the editorial team.',
    ),
  })),
];

export const sampleCases: ResearchCase[] = [
  {
    slug: 'shared-library-pilot',
    reference: 'SAMPLE–001',
    title: 'A shared library pilot',
    summary:
      'Fictional case template exploring access to a shared reading space.',
    categoryId: 'communities',
    categoryLabel: 'Communities',
    kind: 'Case study',
    setting: 'Fictional neighbourhood A',
    tags: ['public space', 'access', 'library'],
    dateLabel: 'Date pending / Sample record',
    sourceNote:
      'Supporting documents are not supplied in this sample. No downloadable document or verified source is represented.',
    body: sampleBody(
      'This fictional library pilot illustrates a case detail layout. There are no actual participants, results or source documents.',
    ),
  },
  {
    slug: 'local-records-review',
    reference: 'SAMPLE–002',
    title: 'Reading a local records archive',
    summary:
      'Fictional research note illustrating how source limitations could be documented.',
    categoryId: 'institutions',
    categoryLabel: 'Institutions',
    kind: 'Research note',
    setting: 'Fictional district B',
    tags: ['archive', 'records', 'methods'],
    dateLabel: 'Date pending / Sample record',
    sourceNote:
      'Supporting documents are not supplied in this sample. No downloadable document or verified source is represented.',
    body: sampleBody(
      'This fictional archive review illustrates a research note. Final case identifiers, jurisdictions, dates and citation requirements are pending.',
    ),
  },
  {
    slug: 'street-shade-observation',
    reference: 'SAMPLE–003',
    title: 'A street shade observation exercise',
    summary: 'Fictional case template for a neighbourhood environment study.',
    categoryId: 'environment',
    categoryLabel: 'Environment',
    kind: 'Case study',
    setting: 'Fictional neighbourhood C',
    tags: ['shade', 'streets', 'environment'],
    dateLabel: 'Date pending / Sample record',
    sourceNote:
      'Supporting documents are not supplied in this sample. No downloadable document or verified source is represented.',
    body: sampleBody(
      'This fictional observation exercise demonstrates a structured case page. It does not report measured temperatures or research outcomes.',
    ),
  },
  {
    slug: 'community-noticeboard',
    reference: 'SAMPLE–004',
    title: 'The community noticeboard',
    summary:
      'Fictional research note on the presentation of shared local information.',
    categoryId: 'communities',
    categoryLabel: 'Communities',
    kind: 'Research note',
    setting: 'Fictional neighbourhood A',
    tags: ['communication', 'participation', 'public space'],
    dateLabel: 'Date pending / Sample record',
    sourceNote:
      'Supporting documents are not supplied in this sample. No downloadable document or verified source is represented.',
    body: sampleBody(
      'This fictional noticeboard study is a sample only. Metadata and publishing permissions will be agreed before real content is added.',
    ),
  },
];

export const sampleTeam: TeamProfile[] = [
  {
    id: 'a',
    artwork: 'avatar',
    label: 'Sample profile A',
    role: 'Founding Editor · India-US Cross Border Law',
    description:
      'Reserved for founding editor portrait and biographical writeup (academic affiliation, cross-border focus, and editorial mandate).',
  },
  {
    id: 'b',
    artwork: 'avatar',
    label: 'Sample profile B',
    role: 'Managing Editor · Disputes & Arbitration',
    description:
      'Reserved for managing editor portrait and biographical writeup (international arbitration, enforcement, and bilateral litigation research).',
  },
  {
    id: 'c',
    artwork: 'avatar',
    label: 'Sample profile C',
    role: 'Senior Research Fellow · Corporate & Transactions',
    description:
      'Reserved for senior research fellow portrait and biographical writeup (cross-border M&A, securities regulation, and technology governance).',
  },
];
