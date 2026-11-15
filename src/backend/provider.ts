import { createClient } from '@supabase/supabase-js';
import { SignedAssets } from './signed-assets';
import { validateBackendContent } from './article-validation';
import { actionError, EditorialActionError } from './action-errors';
import { DemoValidationError } from '../admin/validation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminArticle,
  AdminCase,
  AdminTeam,
  AdminProvider,
  AdminSettings,
  AdminSnapshot,
  RecordKind,
  DemoSubmission,
} from '../admin/types';
import type {
  Article,
  ContentProvider,
  ResearchCase,
  TeamProfile,
} from '../data/types';
import { defaultSiteSettings } from '../data/site-settings';
import type { BackendConfig } from './config';
import { HomepageSettingsError } from './contracts';
import type {
  WebsiteEnvironment,
  StaffSession,
  Author,
  Asset,
} from './contracts';
import { validateLinks } from '../admin/validation';
import { validateUpload } from './uploads';
import {
  researchCategories,
  identifyCategory,
  categoryDisplay,
} from '../config/research-categories';

type Row = {
  id: string;
  data: Record<string, unknown>;
  slug: string;
  category_id: string;
  author_id?: string;
  cover_asset_id?: string;
  status: 'draft' | 'published';
  display_order: number;
  featured: boolean;
  updated_at: string;
};
const table = (kind: RecordKind) => (kind === 'team' ? 'team_profiles' : kind);
function failure(error: { message: string } | null) {
  if (error) throw Error(error.message);
}
function requireContent(record: AdminArticle | AdminCase | AdminTeam) {
  if (record.fictional !== false)
    throw Error('Fictional content cannot be saved to the backend.');
  if (
    !Number.isInteger(record.order) ||
    record.order < 0 ||
    record.order > 1000
  )
    throw Error('Use display order 0–1000.');
  if ('body' in record) {
    validateBackendContent(record);
  } else {
    if (
      !record.label.trim() ||
      !record.role.trim() ||
      !record.description.trim()
    )
      throw Error('Name, role and biography are required.');
    validateLinks(record.links ?? []);
  }
}
export function createBackendEnvironment(
  config: BackendConfig,
  supplied?: SupabaseClient,
): WebsiteEnvironment {
  const client =
    supplied ??
    createClient(config.url, config.key, {
      db: { timeout: 10000, retry: false },
      auth: {
        storageKey: `dilraj-editorial:auth:v1:${new URL(config.url).host}`,
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  let revision = 0;
  let disposed = false;
  let authTask: ReturnType<typeof setTimeout> | undefined;
  let settings: AdminSettings | null = null;
  let settingsError: HomepageSettingsError | null = null;
  let session: StaffSession = {
    loading: true,
    user: null,
    role: null,
    recovery: false,
    error: '',
  };
  let authGeneration = 0;
  const listeners = new Set<() => void>();
  const notify = () => {
    if (disposed) return;
    revision++;
    listeners.forEach((l) => l());
  };
  async function catalog(kind: 'categories' | 'authors'): Promise<Author[]> {
    const r = await client
      .from(kind)
      .select('id,label,description,published')
      .order('label');
    failure(r.error);
    return kind === 'categories'
      ? (r.data ?? []).map(identifyCategory)
      : (r.data ?? []);
  }
  async function loadSettings(): Promise<AdminSettings> {
    const [r, categories] = await Promise.all([
      client
        .from('homepage_settings')
        .select('data,updated_at')
        .eq('id', true)
        .maybeSingle(),
      catalog('categories'),
    ]);
    failure(r.error);
    if (!r.data)
      throw new HomepageSettingsError('unconfigured');
    return {
      ...r.data.data,
      categories,
      fictional: false,
      updatedAt: r.data.updated_at,
    } as AdminSettings;
  }
  async function refresh() {
    references = null;
    try {
      settings = await loadSettings();
      settingsError = null;
    } catch (cause) {
      settings = null;
      settingsError =
        cause instanceof HomepageSettingsError
          ? cause
          : new HomepageSettingsError('unavailable');
    }
    notify();
  }
  let references: { categories: Author[]; authors: Author[] } | null = null;
  const uploads = new WeakMap<
    File,
    {
      owner: string;
      purpose: string;
      label: string;
      path: string;
      uploaded: boolean;
      id?: string;
      pending?: Promise<Asset>;
    }
  >();
  // SDK auth callbacks must return synchronously; DB authorization runs outside them.
  const auth = client.auth.onAuthStateChange((event, value) => {
    if (disposed) return;
    clearTimeout(authTask);
    const generation = ++authGeneration;
    const sameIdentity = !!value && value.user.id === session.user?.id;
    session = {
      // Token renewal must not unmount a dirty editor. DB policies still check
      // current authorization; the background lookup can revoke navigation.
      loading: !!value && !sameIdentity,
      user: value?.user ?? null,
      role: sameIdentity ? session.role : null,
      error: '',
      recovery: !!value && (event === 'PASSWORD_RECOVERY' || session.recovery),
    };
    if (!sameIdentity) {
      images.clear();
      settings = null;
      references = null;
    }
    notify();
    if (!value) {
      void refresh();
      return;
    }
    authTask = setTimeout(() => {
      void (async () => {
        const r = await client.rpc('staff_role');
        if (generation !== authGeneration) return;
        session = {
          ...session,
          loading: false,
          role:
            !r.error && ['admin', 'editor'].includes(r.data) ? r.data : null,
          error: r.error
            ? 'Staff authorization could not be checked. Access is denied.'
            : '',
        };
        notify();
        await refresh();
      })();
    }, 0);
  });
  async function refs() {
    const [categories, authors] = await Promise.all([
      catalog('categories'),
      catalog('authors'),
    ]);
    references = { categories, authors };
    return references;
  }
  const images = new SignedAssets(async (id) => {
    const r = await client
      .from('editorial_assets')
      .select('path,bucket,label')
      .eq('id', id)
      .maybeSingle();
    failure(r.error);
    if (!r.data) throw Error('A referenced asset is unavailable.');
    const signed = await client.storage
      .from(r.data.bucket)
      .createSignedUrl(r.data.path, 300);
    failure(signed.error);
    if (!signed.data?.signedUrl) throw Error('Asset signing failed.');
    return { url: signed.data.signedUrl, label: r.data.label };
  });
  images.start();
  async function resolveAsset(
    id?: string,
  ): Promise<{ coverUrl?: string; coverAlt?: string }> {
    if (!id) return {};
    const asset = await images.get(id);
    return { coverUrl: asset.url, coverAlt: asset.label };
  }
  async function map(row: Row) {
    const ref = references ?? (await refs());
    return {
      ...row.data,
      id: row.id,
      slug: row.slug,
      categoryId: row.category_id,
      categoryLabel: categoryDisplay(
        ref.categories.find((c) => c.id === row.category_id),
      ),
      sampleAuthor:
        ref.authors.find((a) => a.id === row.author_id)?.label ??
        String(row.data.sampleAuthor ?? ''),
      authorId: row.author_id,
      coverAssetId: row.cover_asset_id,
      ...(await resolveAsset(row.cover_asset_id)),
      order: row.display_order,
      featured: row.featured,
      status: row.status,
      fictional: false,
      updatedAt: row.updated_at,
    };
  }
  async function rows(kind: RecordKind, publicOnly = false) {
    let q = client.from(table(kind)).select('*').order('display_order');
    if (publicOnly) q = q.eq('status', 'published');
    const r = await q;
    failure(r.error);
    return r.data as Row[];
  }
  async function save<T extends AdminArticle | AdminCase | AdminTeam>(
    kind: RecordKind,
    record: T,
  ): Promise<T> {
    requireContent(record);
    if (kind === 'articles' && record.status === 'published') {
      const approved = await client
        .from('authors')
        .select('id')
        .eq('id', (record as AdminArticle).authorId!)
        .eq('published', true)
        .maybeSingle();
      if (approved.error) throw actionError(approved.error, 'save');
      if (!approved.data)
        throw new DemoValidationError({
          authorId:
            'This author is not approved for publication. Choose an approved author or save a draft.',
        });
    }
    const { id, order, updatedAt, coverAssetId, ...data } = record;
    delete data.coverUrl;
    delete data.coverAlt;
    if ('submissionId' in data) delete data.submissionId;
    if ('documents' in data) delete data.documents;
    const values = {
      data,
      display_order: order,
      status: 'status' in record ? record.status : 'draft',
      ...(kind !== 'team'
        ? {
            slug: (record as AdminArticle).slug,
            category_id: (record as AdminArticle).categoryId,
            featured:
              record.status === 'published' &&
              !!(record as AdminArticle).featured,
          }
        : {}),
      ...(kind !== 'cases' ? { cover_asset_id: coverAssetId || null } : {}),
      ...(kind === 'articles'
        ? { author_id: (record as AdminArticle).authorId || null }
        : {}),
    };
    if (id && !updatedAt) throw Error('Reload this record before updating it.');
    const q = id
      ? client
          .from(table(kind))
          .update(values)
          .eq('id', id)
          .eq('updated_at', updatedAt!)
      : client.from(table(kind)).insert(values);
    const r = await q.select('*').maybeSingle();
    if (r.error)
      throw actionError(
        { code: r.error.code, message: r.error.message, status: r.status },
        'save',
      );
    if (!r.data)
      throw Error(
        'The record changed or access was revoked. Reload before saving.',
      );
    references = null;
    const result = (await map(r.data)) as T;
    await refresh();
    return result;
  }
  const admin: AdminProvider = {
    async readSnapshot(): Promise<AdminSnapshot> {
      // Do not use cached frontend authorization to grant DB access.
      const permission = await client.rpc('staff_role');
      failure(permission.error);
      if (!['admin', 'editor'].includes(permission.data))
        throw Error('Authorized staff access is required.');
      const stats = await client.rpc('dashboard_counts');
      failure(stats.error);
      if (
        !stats.data ||
        !['drafts', 'published', 'pending', 'cases'].every(
          (k) => Number.isSafeInteger(stats.data[k]) && stats.data[k] >= 0,
        )
      )
        throw Error('Database content counts are unavailable.');
      await refs();
      const [a, c, t, s, activity, config] = await Promise.all([
        rows('articles'),
        rows('cases'),
        rows('team'),
        client
          .from('submissions')
          .select('*')
          .order('created_at', { ascending: false }),
        client
          .from('content_activity')
          .select('*')
          .order('at', { ascending: false })
          .limit(30),
        loadSettings().catch(async (e) => {
          const r = await client
            .from('homepage_settings')
            .select('id')
            .eq('id', true)
            .maybeSingle();
          failure(r.error);
          if (r.data) throw e;
          // Editable, explicitly provisional empty setup only; never public fallback.
          return {
            ...structuredClone(defaultSiteSettings),
            categories: await catalog('categories'),
            featuredArticleIds: [],
            featuredCaseIds: [],
            fictional: false,
          } as AdminSettings;
        }),
      ]);
      failure(s.error);
      failure(activity.error);
      return {
        version: 1,
        counts: stats.data,
        articles: await Promise.all(
          a.map(async (r) => (await map(r)) as AdminArticle),
        ),
        cases: await Promise.all(
          c.map(async (r) => (await map(r)) as unknown as AdminCase),
        ),
        team: await Promise.all(
          t.map(async (r) => (await map(r)) as unknown as AdminTeam),
        ),
        submissions: (s.data ?? []).map((r) => ({
          ...r.data,
          id: r.id,
          categoryId: r.category_id,
          status: r.status,
          fictional: false,
          convertedArticleId: r.converted_article_id ?? undefined,
        })) as DemoSubmission[],
        settings: config,
        activity: activity.data ?? [],
      };
    },
    saveArticle: (r) => save('articles', r),
    saveCase: (r) => save('cases', r),
    saveTeam: (r) => save('team', r),
    async deleteRecord(kind, id) {
      const r = await client
        .from(table(kind))
        .delete()
        .eq('id', id)
        .select('id');
      failure(r.error);
      if (!r.data?.length) throw Error('Record unavailable or access denied.');
      await refresh();
    },
    async reorder(kind, ids) {
      const r = await client.rpc('reorder_content', { kind, ids });
      failure(r.error);
      await refresh();
    },
    async reviewSubmission(id, status) {
      const r = await client.rpc('review_submission', {
        submission_id: id,
        decision: status,
      });
      failure(r.error);
      await refresh();
    },
    async convertSubmission(id) {
      const r = await client.rpc('convert_submission', { submission_id: id });
      failure(r.error);
      const result = await client
        .from('articles')
        .select('*')
        .eq('id', r.data)
        .single();
      failure(result.error);
      await refs();
      const record = (await map(result.data)) as AdminArticle;
      await refresh();
      return record;
    },
    async saveSettings(value) {
      if (value.fictional !== false)
        throw Error('Demo settings cannot be imported.');
      validateLinks(value.socialLinks);
      const r = await client.rpc('save_homepage', { payload: value });
      failure(r.error);
      references = null;
      await refresh();
    },
    async resetDemo() {
      throw Error('Demo reset is unavailable in backend mode.');
    },
  };
  const publicProvider: ContentProvider = {
    getSiteSettings() {
      if (!settings)
        throw settingsError ?? new HomepageSettingsError('loading');
      return structuredClone(settings);
    },
    listCategories: () => catalog('categories'),
    async listArticles(query = {}) {
      await refs();
      const all = await Promise.all(
        (await rows('articles', true)).map(
          async (r) => (await map(r)) as unknown as Article,
        ),
      );
      const selected = settings?.featuredArticleIds ?? [];
      return all
        .map((r) => ({ ...r, featured: selected.includes(r.id) }))
        .filter(
          (r) =>
            (!query.category ||
              r.categoryId === query.category ||
              references?.categories.some(
                (c) =>
                  c.id === r.categoryId &&
                  identifyCategory(c).slug === query.category,
              )) &&
            (!query.search ||
              `${r.title} ${r.summary} ${r.sampleAuthor}`
                .toLowerCase()
                .includes(query.search.toLowerCase())),
        )
        .sort((a, b) => {
          const rank = (r: Article) => {
            const id = (r as Article & { id: string }).id;
            const n = selected.indexOf(id);
            return n < 0 ? 1000 : n;
          };
          return rank(a) - rank(b);
        });
    },
    async getArticle(slug) {
      return (
        (await publicProvider.listArticles()).find((r) => r.slug === slug) ??
        null
      );
    },
    async listCases(query = {}) {
      await refs();
      const all = await Promise.all(
        (await rows('cases', true)).map(
          async (r) => (await map(r)) as unknown as ResearchCase,
        ),
      );
      const selected = settings?.featuredCaseIds ?? [];
      return all
        .filter(
          (r) =>
            (!query.category ||
              r.categoryId === query.category ||
              references?.categories.some(
                (c) =>
                  c.id === r.categoryId &&
                  identifyCategory(c).slug === query.category,
              )) &&
            (!query.kind || r.kind === query.kind) &&
            (!query.search ||
              `${r.title} ${r.reference} ${r.summary} ${r.setting} ${(r.tags ?? []).join(' ')}`
                .toLowerCase()
                .includes(query.search.toLowerCase())),
        )
        .sort((a, b) => {
          const rank = (r: ResearchCase) => {
            const n = selected.indexOf((r as ResearchCase & { id: string }).id);
            return n < 0 ? 1000 : n;
          };
          return rank(a) - rank(b);
        });
    },
    async getCase(slug) {
      const record =
        (await publicProvider.listCases()).find((r) => r.slug === slug) ?? null;
      if (record)
        record.documents = await documents(
          (record as ResearchCase & { id: string }).id,
          true,
        );
      return record;
    },
    async listTeam() {
      await refs();
      return await Promise.all(
        (await rows('team', true)).map(
          async (r) => (await map(r)) as unknown as TeamProfile,
        ),
      );
    },
  };
  async function documents(caseId: string, publicOnly = false) {
    let q = client
      .from('case_documents')
      .select('id,asset_id,label,is_public')
      .eq('case_id', caseId);
    if (publicOnly) q = q.eq('is_public', true);
    const r = await q;
    failure(r.error);
    return await Promise.all(
      (r.data ?? []).map(async (d) => ({
        id: d.id,
        path: '',
        bucket: 'case-documents',
        label: d.label,
        isPublic: d.is_public,
        url: (await resolveAsset(d.asset_id)).coverUrl,
      })),
    );
  }
  const backend: NonNullable<WebsiteEnvironment['backend']> = {
    images,
    client,
    getSession: () => session,
    async signIn(email, password) {
      const r = await client.auth.signInWithPassword({ email, password });
      if (r.error) throw r.error;
    },
    async signOut() {
      const r = await client.auth.signOut();
      failure(r.error);
      session = {
        loading: false,
        user: null,
        role: null,
        error: '',
        recovery: false,
      };
      settings = null;
      notify();
    },
    async recover(email) {
      const r = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/recovery`,
      });
      if (r.error) throw r.error;
    },
    async updatePassword(password) {
      if (!session.recovery || !session.user)
        throw Error('Open a valid password recovery link first.');
      const r = await client.auth.updateUser({ password });
      if (r.error) throw r.error;
      session = { ...session, recovery: false };
      notify();
    },
    catalog,
    async saveCatalog(kind, value) {
      if (!value.label.trim()) throw Error('A name is required.');
      if (
        kind === 'categories' &&
        !researchCategories.some((c) => c.label === value.label)
      )
        throw Error(
          'Choose one of the four confirmed research categories. Existing unmapped records require an explicit editorial mapping.',
        );
      const values = {
        label: value.label,
        description: value.description,
        published: value.published,
      };
      const r = value.id
        ? await client
            .from(kind)
            .update(values)
            .eq('id', value.id)
            .select('id,label,description,published')
        : await client
            .from(kind)
            .insert(values)
            .select('id,label,description,published');
      failure(r.error);
      if (!r.data?.length) throw Error('Access denied or record removed.');
      references = null;
      await refresh();
      return r.data[0];
    },
    async deleteCatalog(kind, id) {
      const r = await client.from(kind).delete().eq('id', id).select('id');
      failure(r.error);
      if (!r.data?.length) throw Error('Access denied or record removed.');
      references = null;
      await refresh();
    },
    async upload(file, purpose, label): Promise<Asset> {
      await validateUpload(file, purpose);
      if (!label.trim() || Array.from(label).length > 200)
        throw new EditorialActionError(
          'Add an image description / alt text of 1–200 characters before uploading.',
          'asset-label',
        );
      const authResult = await client.auth.getUser();
      const user = authResult.data.user;
      if (authResult.error || !user)
        throw actionError(authResult.error, 'session');
      const permission = await client.rpc('staff_role');
      if (permission.error) throw actionError(permission.error, 'permission');
      if (!['admin', 'editor'].includes(permission.data))
        throw actionError(null, 'permission');
      const bucket =
        purpose === 'image' ? 'editorial-images' : 'case-documents';
      const extension: Record<string, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
      };
      let state = uploads.get(file);
      if (
        !state ||
        state.owner !== user.id ||
        state.purpose !== purpose ||
        state.label !== label
      ) {
        state = {
          owner: user.id,
          purpose,
          label,
          path: `${user.id}/${crypto.randomUUID()}.${extension[file.type]}`,
          uploaded: false,
        };
        uploads.set(file, state);
      }
      if (state.pending) return state.pending;
      const attempt = state;
      const pending = (async () => {
        let stage: 'storage' | 'asset-reference' | 'preview' = 'storage';
        try {
          if (!attempt.uploaded) {
            const stored = await client.storage
              .from(bucket)
              .upload(attempt.path, file, {
                contentType: file.type,
                upsert: false,
              });
            // This random path belongs to this same in-memory attempt. A conflict
            // after an interrupted response means retry can finish the reference.
            if (
              stored.error &&
              !['409', 'Duplicate'].includes(
                String(
                  (stored.error as { statusCode?: string; error?: string })
                    .statusCode ?? (stored.error as { error?: string }).error,
                ),
              )
            )
              throw stored.error;
            attempt.uploaded = true;
          }
          stage = 'asset-reference';
          if (!attempt.id) {
            // Recover a metadata insert whose acknowledgement was interrupted.
            const existing = await client
              .from('editorial_assets')
              .select('id')
              .eq('path', attempt.path)
              .eq('bucket', bucket)
              .maybeSingle();
            if (existing.error)
              throw {
                code: existing.error.code,
                message: existing.error.message,
                status: existing.status,
              };
            if (existing.data) attempt.id = existing.data.id;
            else {
              const inserted = await client
                .from('editorial_assets')
                .insert({
                  path: attempt.path,
                  bucket,
                  label,
                  mime: file.type,
                  bytes: file.size,
                })
                .select('id')
                .single();
              if (inserted.error)
                throw {
                  code: inserted.error.code,
                  message: inserted.error.message,
                  status: inserted.status,
                };
              if (!inserted.data?.id) throw Error('Reference unconfirmed');
              attempt.id = inserted.data.id;
            }
          }
          stage = 'preview';
          return {
            id: attempt.id!,
            path: attempt.path,
            bucket,
            label,
            url: (await resolveAsset(attempt.id!)).coverUrl,
          };
        } catch (error) {
          throw actionError(error, stage);
        }
      })();
      attempt.pending = pending;
      try {
        return await pending;
      } finally {
        attempt.pending = undefined;
      }
    },
    documents,
    async submissionAttachments(submissionId) {
      const r = await client
        .from('submission_attachments')
        .select('id,path,label')
        .eq('submission_id', submissionId);
      failure(r.error);
      return await Promise.all(
        (r.data ?? []).map(async (a) => {
          const signed = await client.storage
            .from('submission-attachments')
            .createSignedUrl(a.path, 300);
          failure(signed.error);
          return {
            ...a,
            bucket: 'submission-attachments',
            url: signed.data?.signedUrl,
          };
        }),
      );
    },
    async attachDocument(caseId, assetId, label, isPublic) {
      const r = await client.from('case_documents').insert({
        case_id: caseId,
        asset_id: assetId,
        label,
        is_public: isPublic,
      });
      failure(r.error);
      notify();
    },
    async removeDocument(id) {
      const r = await client
        .from('case_documents')
        .delete()
        .eq('id', id)
        .select('id');
      failure(r.error);
      if (!r.data?.length) throw Error('Document unavailable.');
      notify();
    },
  };
  void auth; // SDK subscription lives for this application environment, not per route.
  const ready = refresh();
  return {
    ready,
    mode: 'supabase',
    dispose: () => {
      disposed = true;
      images.dispose();
      authGeneration++;
      clearTimeout(authTask);
      auth.data.subscription.unsubscribe();
      client.auth.stopAutoRefresh();
      listeners.clear();
    },
    backend,
    admin,
    publicProvider,
    getRevision: () => revision,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh: () => {
      void refresh();
    },
  };
}
