export type Category = {
  id: string;
  label: string;
  description: string;
  slug?: string;
  mappingPending?: boolean;
};
export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'note'; text: string };

export type Article = {
  coverAssetId?: string;
  id: string;
  fictional?: boolean;
  coverUrl?: string;
  coverAlt?: string;
  slug: string;
  title: string;
  summary: string;
  categoryId: string;
  categoryLabel: string;
  readingMinutes: number;
  sampleAuthor: string;
  featured: boolean;
  artwork: ArtworkId;
  publicationLabel: string;
  body: ContentBlock[];
};
export type ResearchCase = {
  fictional?: boolean;
  documents?: { id: string; label: string; url?: string }[];
  featured?: boolean;
  supportingDocuments?: string[];
  slug: string;
  reference: string;
  title: string;
  summary: string;
  categoryId: string;
  categoryLabel: string;
  kind: 'Case study' | 'Research note';
  setting: string;
  tags: string[];
  dateLabel: string;
  sourceNote: string;
  body: ContentBlock[];
};
export type TeamProfile = {
  coverAssetId?: string;
  fictional?: boolean;
  coverUrl?: string;
  coverAlt?: string;
  id: string;
  label: string;
  role: string;
  description: string;
  artwork: ArtworkId;
  links?: import('./site-settings').SocialLink[];
};
export type ArticleQuery = { category?: string; search?: string };
export type CaseQuery = { search?: string; category?: string; kind?: string };

// Read-only, asynchronous boundary. No submission or authentication methods exist.
export interface ArticleProvider {
  listArticles(query?: ArticleQuery): Promise<Article[]>;
  getArticle(slug: string): Promise<Article | null>;
}
export interface CaseProvider {
  listCases(query?: CaseQuery): Promise<ResearchCase[]>;
  getCase(slug: string): Promise<ResearchCase | null>;
}
export interface DirectoryProvider {
  getSiteSettings(): import('./site-settings').PublicSiteSettings;
  listCategories(): Promise<Category[]>;
  listTeam(): Promise<TeamProfile[]>;
}
export type ContentProvider = ArticleProvider &
  CaseProvider &
  DirectoryProvider;
import type { ArtworkId } from '../config/media';
