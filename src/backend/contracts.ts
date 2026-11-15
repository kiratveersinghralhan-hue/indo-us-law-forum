import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { DemoEnvironment } from '../admin/mock-admin-provider';
export class HomepageSettingsError extends Error {
  constructor(readonly kind: 'loading' | 'unconfigured' | 'unavailable') {
    super(`Homepage settings: ${kind}`);
    this.name = 'HomepageSettingsError';
  }
}
export type Author = {
  id: string;
  label: string;
  description: string;
  published: boolean;
};
export type StaffSession = {
  loading: boolean;
  user: User | null;
  role: 'editor' | 'admin' | null;
  recovery: boolean;
  error: string;
};
export type Asset = {
  id: string;
  path: string;
  bucket: string;
  label: string;
  url?: string;
};
export type BackendCapabilities = {
  images?: import('./signed-assets').SignedAssets;
  client: SupabaseClient;
  getSession(): StaffSession;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  recover(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  catalog(kind: 'categories' | 'authors'): Promise<Author[]>;
  saveCatalog(kind: 'categories' | 'authors', record: Author): Promise<Author>;
  deleteCatalog(kind: 'categories' | 'authors', id: string): Promise<void>;
  upload(
    file: File,
    purpose: 'image' | 'document',
    label: string,
  ): Promise<Asset>;
  attachDocument(
    caseId: string,
    assetId: string,
    label: string,
    isPublic: boolean,
  ): Promise<void>;
  removeDocument(id: string): Promise<void>;
  documents(caseId: string): Promise<(Asset & { isPublic: boolean })[]>;
  submissionAttachments(submissionId: string): Promise<Asset[]>;
};
export type WebsiteEnvironment = DemoEnvironment & {
  ready?: Promise<void>;
  mode?: 'mock' | 'supabase';
  backend?: BackendCapabilities;
  dispose?: () => void;
};
