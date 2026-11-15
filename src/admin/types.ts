import type {
  Article,
  Category,
  ContentBlock,
  ResearchCase,
  TeamProfile,
} from '../data/types';
import type { PublicSiteSettings } from '../data/site-settings';

export type PublicationStatus = 'draft' | 'published';
export type RecordKind = 'articles' | 'cases' | 'team';
type DemoIdentity = {
  id: string;
  order: number;
  fictional: boolean;
  updatedAt?: string;
  coverAssetId?: string;
  coverUrl?: string;
  coverAlt?: string;
};
export type AdminArticle = Article &
  DemoIdentity & {
    status: PublicationStatus;
    submissionId?: string;
    authorId?: string;
  };
export type AdminCase = ResearchCase &
  DemoIdentity & { status: PublicationStatus };
export type AdminTeam = TeamProfile &
  DemoIdentity & { status?: PublicationStatus };
export type DemoSubmission = {
  id: string;
  title: string;
  excerpt: string;
  categoryId: string;
  author: string;
  body: ContentBlock[];
  status: 'pending' | 'approved' | 'rejected';
  convertedArticleId?: string;
  fictional: boolean;
};
export type AdminSettings = PublicSiteSettings & {
  updatedAt?: string;
  categories: Category[];
  featuredArticleIds: string[];
  featuredCaseIds: string[];
  fictional: boolean;
};
export type ContentActivity = { id: string; at: string; message: string };
export type AdminSnapshot = {
  counts?: {
    drafts: number;
    published: number;
    pending: number;
    cases: number;
  };
  version: 1;
  articles: AdminArticle[];
  cases: AdminCase[];
  team: AdminTeam[];
  submissions: DemoSubmission[];
  settings: AdminSettings;
  activity: ContentActivity[];
};
// Shared editorial mutation boundary. Authentication is separate; mock operations
// are untrusted local demos, while the backend enforces DB authorization.
export interface AdminProvider {
  readSnapshot(): Promise<AdminSnapshot>;
  saveArticle(record: AdminArticle): Promise<AdminArticle>;
  saveCase(record: AdminCase): Promise<AdminCase>;
  saveTeam(record: AdminTeam): Promise<AdminTeam>;
  deleteRecord(kind: RecordKind, id: string): Promise<void>;
  reorder(kind: RecordKind, ids: string[]): Promise<void>;
  reviewSubmission(id: string, status: 'approved' | 'rejected'): Promise<void>;
  convertSubmission(id: string): Promise<AdminArticle>;
  saveSettings(settings: AdminSettings): Promise<void>;
  resetDemo(): Promise<void>;
}
