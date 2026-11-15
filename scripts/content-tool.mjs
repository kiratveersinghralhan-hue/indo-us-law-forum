import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { validateManifest, prelaunchIssues } from './content-format.mjs';
const [command, path, ...flags] = process.argv.slice(2);
if (!['validate', 'import', 'prelaunch'].includes(command) || !path)
  throw Error(
    'Use: node scripts/content-tool.mjs validate|import|prelaunch FILE [--apply] [--allow-remote]',
  );
const value = JSON.parse(await readFile(path, 'utf8'));
const issues =
  command === 'prelaunch'
    ? prelaunchIssues(value.snapshot, value.branding, value.assets)
    : validateManifest(value);
if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else if (command !== 'import')
  console.log(
    'Content validation passed. This does not establish backend security or launch readiness.',
  );
else {
  const url = process.env.CONTENT_SUPABASE_URL,
    key = process.env.CONTENT_PUBLISHABLE_KEY,
    token = process.env.CONTENT_STAFF_ACCESS_TOKEN;
  if (!url || !key?.startsWith('sb_publishable_') || !token)
    throw Error(
      'Set dedicated URL, publishable key and staff access token in your local process environment. Never place credentials in the manifest.',
    );
  if (
    !['localhost', '127.0.0.1'].includes(new URL(url).hostname) &&
    !flags.includes('--allow-remote')
  )
    throw Error(
      'Remote operations require separate project authorization and explicit --allow-remote.',
    );
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const role = await client.rpc('staff_role');
  if (role.error || !['editor', 'admin'].includes(role.data))
    throw Error('Authorized staff session required.');
  // Complete preflight before any mutation. No upsert and no implicit overwrite.
  const plan = [];
  for (const kind of ['categories', 'authors', 'articles', 'cases', 'team'])
    for (const entry of value[kind]) {
      const table = kind === 'team' ? 'team_profiles' : kind;
      const existing = await client
        .from(table)
        .select('*')
        .eq('id', entry.record.id)
        .maybeSingle();
      if (existing.error)
        throw Error(`Preflight failed: ${kind}/${entry.record.id}`);
      if (entry.intent === 'create' && existing.data)
        throw Error(
          `Already exists: ${kind}/${entry.record.id}. Review and supply an explicit update revision; nothing was overwritten.`,
        );
      if (
        entry.intent === 'update' &&
        (!existing.data || existing.data.updated_at !== entry.expectedUpdatedAt)
      )
        throw Error(
          `Stale or missing record: ${kind}/${entry.record.id}. No changes applied.`,
        );
      if (entry.intent === 'update' && existing.data?.status === 'published')
        throw Error(
          'Unpublish intentionally in admin before importing an update; imports never change publication implicitly.',
        );
      if (!['categories', 'authors', 'team'].includes(kind)) {
        const slug = await client
          .from(table)
          .select('id')
          .eq('slug', entry.record.slug)
          .maybeSingle();
        if (slug.error || (slug.data && slug.data.id !== entry.record.id))
          throw Error(`Ambiguous or conflicting slug: ${entry.record.slug}`);
      }
      plan.push({ kind, table, entry });
    }
  const known = new Map();
  for (const k of ['categories', 'authors', 'editorial_assets']) {
    const r = await client.from(k).select('id');
    if (r.error) throw Error(`Cannot check ${k} mappings.`);
    known.set(k, new Set(r.data.map((r) => r.id)));
  }
  for (const { kind, entry } of plan)
    if (['categories', 'authors'].includes(kind))
      known.get(kind).add(entry.record.id);
  for (const { kind, entry } of plan) {
    const r = entry.record;
    if (
      ['articles', 'cases'].includes(kind) &&
      !known.get('categories').has(r.categoryId)
    )
      throw Error('Unresolved category mapping.');
    if (kind === 'articles' && !known.get('authors').has(r.authorId))
      throw Error('Unresolved author mapping.');
    if (
      ['articles', 'team'].includes(kind) &&
      !known.get('editorial_assets').has(r.coverAssetId)
    )
      throw Error('Missing uploaded image mapping.');
  }
  if (!flags.includes('--apply'))
    console.log(
      `Dry run validated ${plan.length} operations. No records changed. Review before --apply.`,
    );
  else {
    // Each record has an optimistic revision check. Save the manifest/receipt and
    // re-review after a partial failure; deliberately avoid silently retrying upserts.
    for (const { kind, table, entry } of plan) {
      const r = entry.record;
      let values;
      if (['categories', 'authors'].includes(kind))
        values = {
          id: r.id,
          label: r.label,
          description: r.description,
          ...(entry.intent === 'create' ? { published: false } : {}),
        };
      else {
        const data = { ...r };
        for (const field of [
          'id',
          'order',
          'coverAssetId',
          'coverUrl',
          'coverAlt',
          'updatedAt',
          'submissionId',
          'documents',
        ])
          delete data[field];
        values = {
          id: r.id,
          data,
          status: 'draft',
          display_order: r.order,
          ...(kind !== 'team'
            ? {
                slug: r.slug,
                category_id: r.categoryId,
                featured: !!r.featured,
              }
            : {}),
          ...(kind !== 'cases' ? { cover_asset_id: r.coverAssetId } : {}),
          ...(kind === 'articles' ? { author_id: r.authorId } : {}),
          ...(kind === 'cases' ? { metadata: r.metadata ?? {} } : {}),
        };
      }
      const q =
        entry.intent === 'create'
          ? client.from(table).insert(values)
          : client
              .from(table)
              .update(values)
              .eq('id', r.id)
              .eq('updated_at', entry.expectedUpdatedAt);
      const result = await q.select('id,updated_at');
      if (result.error || !result.data?.length)
        throw Error(
          `Stopped at ${kind}/${r.id}. Earlier operations may have saved drafts; export revisions before retrying. No automatic publication.`,
        );
      console.log(
        `${kind}/${r.id} saved as draft/private; revision ${result.data[0].updated_at}`,
      );
    }
  }
}
