import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';
/* global document, innerWidth */

// Deliberately separate from the LOCAL ONLY runner. No inferred remote targets.
const ref = 'erwliwgbjlutczmtqoss';
const url = `https://${ref}.supabase.co`;
assert.equal(
  process.env.VERIFY_DEDICATED_PROJECT,
  ref,
  'Explicit dedicated-project confirmation required',
);
assert.equal(
  readFileSync('supabase/.temp/project-ref', 'utf8').trim(),
  ref,
  'Linked project mismatch',
);
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('='))
    .map((line) => [
      line.split('=')[0].trim(),
      line.slice(line.indexOf('=') + 1).trim(),
    ]),
);
assert.equal(env.VITE_DATA_MODE, 'supabase');
assert.equal(env.VITE_SUPABASE_URL, url);
assert.ok(env.VITE_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'));
const folder = resolve('.qa/dedicated-backend/http');
mkdirSync(folder, { recursive: true });
function cli(args) {
  try {
    return JSON.parse(
      execFileSync(
        process.execPath,
        ['node_modules/supabase/dist/supabase.js', ...args, '--output', 'json'],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 120000,
        },
      ),
    );
  } catch {
    // Never echo API-key command stdout/stderr, credentials or child-process args.
    throw Error(
      'Authenticated CLI request failed. Inspect access in a private terminal.',
    );
  }
}
function sql(query) {
  // These queries contain fixture UUIDs only, never passwords or API keys.
  const file = resolve(folder, 'operation.sql');
  writeFileSync(file, query);
  return cli(['db', 'query', '--linked', '--project-ref', ref, '--file', file])
    .rows;
}
const keys = cli(['projects', 'api-keys', '--project-ref', ref, '--reveal']);
assert.ok(
  keys.some(
    (key) =>
      key.type === 'publishable' &&
      key.api_key === env.VITE_SUPABASE_PUBLISHABLE_KEY,
  ),
  'Provided key must match authorized project',
);
const secret = keys.find((key) => key.type === 'secret')?.api_key;
assert.ok(
  secret?.startsWith('sb_secret_'),
  'Server-only administrative key unavailable',
);
const make = (key) =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { timeout: 10000, retry: false },
  });
const service = make(secret),
  anon = make(env.VITE_SUPABASE_PUBLISHABLE_KEY),
  ordinary = make(env.VITE_SUPABASE_PUBLISHABLE_KEY),
  staff = make(env.VITE_SUPABASE_PUBLISHABLE_KEY);
// Secrets and generated test passwords stay in memory, never in artifacts.
const checks = [];
const ok = (r, label) => {
  if (r.error)
    throw Error(
      `${label}: ${r.error.code ?? r.error.status} ${r.error.message}`,
    );
  checks.push(label);
  return r.data;
};
const deny = (r, label) => {
  assert.ok(r.error, label);
  checks.push(label);
};
const equal = (actual, expected, label) => {
  assert.deepEqual(actual, expected, label);
  checks.push(label);
};
equal(
  ok(await anon.rpc('backend_project_marker'), 'Schema marker'),
  'dilraj-editorial-v1',
  'Dedicated schema identity',
);
// Safe initial commissioning only. Refuse to rewrite approved content/settings.
for (const table of [
  'articles',
  'cases',
  'team_profiles',
  'homepage_settings',
  'authors',
  'editorial_assets',
  'submissions',
])
  equal(
    ok(await service.from(table).select('id'), `Preflight ${table}`).length,
    0,
    `No existing ${table} may be overwritten`,
  );
const baselineActivity = new Set(
  ok(
    await service.from('content_activity').select('id'),
    'Baseline audit IDs',
  ).map((row) => row.id),
);
const run = crypto.randomUUID();
const ids = Object.fromEntries(
  [
    'category',
    'author',
    'asset',
    'article',
    'secondArticle',
    'draft',
    'case',
    'draftCase',
    'team',
    'draftTeam',
    'pdf',
    'privatePdf',
    'submission',
    'attachment',
    'request',
  ].map((name) => [name, crypto.randomUUID()]),
);
const label = `VERIFICATION TEST — NOT CLIENT CONTENT ${run.slice(0, 8)}`;
const users = [];
const paths = [];
const extraAssets = new Set();
const journal = {
  target: ref,
  run,
  label,
  ids,
  users,
  paths,
  checks,
  cleaned: false,
};
const saveJournal = () =>
  writeFileSync(
    resolve(folder, `fixtures-${run}.json`),
    JSON.stringify(journal, null, 2),
  );
const passwords = {
  staff: `${crypto.randomUUID()}Aa1!`,
  ordinary: `${crypto.randomUUID()}Aa1!`,
};
const accounts = {};
const body = [
  {
    type: 'paragraph',
    text: `${label}. Disposable backend verification fixture; not legal research.`,
  },
];
const articleData = (title) => ({
  title,
  summary: label,
  body,
  readingMinutes: 1,
  artwork: 'institutions',
  publicationLabel: label,
  fictional: false,
});
let image;
let browser, converted;
let cleanupError;
try {
  browser = await chromium.launch({ headless: true });
  const artworkPage = await browser.newPage();
  const testImage = await artworkPage.evaluate(
    (runLabel) => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 900;
      const paint = canvas.getContext('2d');
      paint.fillStyle = '#102c50';
      paint.fillRect(0, 0, 600, 900);
      paint.fillStyle = '#ffffff';
      paint.fillRect(35, 35, 530, 830);
      paint.fillStyle = '#194984';
      paint.fillRect(35, 35, 530, 220);
      paint.fillStyle = '#ffffff';
      paint.font = 'bold 44px serif';
      paint.fillText('VERIFICATION', 65, 125);
      paint.fillText('TEST ONLY', 65, 185);
      paint.fillStyle = '#102c50';
      paint.font = 'bold 32px sans-serif';
      paint.fillText('NOT CLIENT CONTENT', 65, 340);
      paint.font = '26px sans-serif';
      paint.fillText(runLabel, 65, 405);
      paint.fillText('Disposable cover fixture', 65, 730);
      return canvas.toDataURL('image/png');
    },
    run.slice(0, 8),
  );
  image = Uint8Array.from(Buffer.from(testImage.split(',')[1], 'base64'));
  await artworkPage.close();
  for (const role of ['staff', 'ordinary']) {
    const email = `verification-${role}-${run}@example.invalid`;
    const data = ok(
      await service.auth.admin.createUser({
        email,
        password: passwords[role],
        email_confirm: true,
        user_metadata: { verification_run: run, label },
      }),
      `Create disposable ${role} Auth account`,
    );
    users.push(data.user.id);
    accounts[role] = { id: data.user.id, email };
    saveJournal();
  }
  sql(
    `insert into private.staff_accounts(user_id,role) values('${accounts.staff.id}','editor');`,
  );
  for (const [client, role] of [
    [ordinary, 'ordinary'],
    [staff, 'staff'],
  ])
    ok(
      await client.auth.signInWithPassword({
        email: accounts[role].email,
        password: passwords[role],
      }),
      `Real ${role} password sign-in`,
    );
  equal(
    ok(await ordinary.rpc('staff_role'), 'Ordinary role lookup'),
    null,
    'Ordinary has no staff permission',
  );
  equal(
    ok(await staff.rpc('staff_role'), 'Staff role lookup'),
    'editor',
    'Staff authorization comes from database',
  );
  ok(
    await staff
      .from('categories')
      .insert({ id: ids.category, label, description: label, published: true }),
    'Staff creates labelled category',
  );
  ok(
    await staff
      .from('authors')
      .insert({ id: ids.author, label, description: label, published: true }),
    'Staff creates author',
  );
  const imagePath = `${accounts.staff.id}/${ids.asset}.png`;
  paths.push({ bucket: 'editorial-images', path: imagePath });
  saveJournal();
  ok(
    await staff.storage
      .from('editorial-images')
      .upload(imagePath, image, { contentType: 'image/png', upsert: false }),
    'Real staff cover upload',
  );
  ok(
    await staff.from('editorial_assets').insert({
      id: ids.asset,
      path: imagePath,
      bucket: 'editorial-images',
      label,
      mime: 'image/png',
      bytes: image.length,
    }),
    'Cover metadata persists',
  );
  for (const [name, order] of [
    ['article', 0],
    ['secondArticle', 1],
    ['draft', 2],
  ])
    ok(
      await staff.from('articles').insert({
        id: ids[name],
        slug: `verification-${ids[name]}`,
        category_id: ids.category,
        author_id: ids.author,
        cover_asset_id: ids.asset,
        status: 'draft',
        display_order: order,
        data: articleData(`${label} ${name}`),
      }),
      `Staff creates ${name}`,
    );
  for (const client of [anon, ordinary]) {
    equal(
      ok(await client.from('articles').select('id'), 'Draft read attempt')
        .length,
      0,
      'Draft article hidden by RLS',
    );
    deny(
      await client.storage.from('editorial-images').download(imagePath),
      'Unpublished cover HTTP download denied',
    );
    deny(
      await client.storage
        .from('editorial-images')
        .createSignedUrl(imagePath, 60),
      'Unpublished cover signing denied',
    );
    deny(
      await client.from('articles').insert({
        slug: `forbidden-${crypto.randomUUID()}`,
        category_id: ids.category,
        data: articleData(label),
      }),
      'Non-staff article insertion denied',
    );
    deny(
      await client.storage
        .from('editorial-images')
        .upload(`${accounts.ordinary.id}/${crypto.randomUUID()}.png`, image, {
          contentType: 'image/png',
        }),
      'Non-staff upload denied',
    );
  }
  deny(
    await ordinary
      .schema('private')
      .from('staff_accounts')
      .insert({ user_id: accounts.ordinary.id, role: 'admin' }),
    'Self-provisioning denied',
  );
  ok(
    await ordinary.auth.updateUser({ data: { role: 'admin', is_staff: true } }),
    'Metadata escalation attempt stored as untrusted metadata',
  );
  equal(
    ok(await ordinary.rpc('staff_role'), 'Role after metadata attempt'),
    null,
    'User metadata grants no authorization',
  );
  deny(
    await ordinary.rpc('save_homepage', { payload: {} }),
    'Ordinary cannot save homepage',
  );
  deny(
    await ordinary.rpc('reorder_content', {
      kind: 'articles',
      ids: [ids.article, ids.secondArticle, ids.draft],
    }),
    'Ordinary cannot reorder content',
  );
  deny(
    await staff.storage
      .from('editorial-images')
      .upload(`${accounts.staff.id}/${crypto.randomUUID()}.txt`, 'test', {
        contentType: 'text/plain',
      }),
    'Server MIME restriction',
  );
  deny(
    await staff.storage
      .from('editorial-images')
      .upload(
        `${accounts.staff.id}/${crypto.randomUUID()}.png`,
        new Uint8Array(3145729),
        { contentType: 'image/png' },
      ),
    'Server image size restriction',
  );
  const settings = {
    hero: {
      eyebrow: label,
      lines: ['Verification', 'test only.', 'Not client content.'],
      introduction: label,
    },
    sections: ['focus', 'featured', 'repository', 'team', 'contribution'].map(
      (id) => ({ id, label: id, visible: true }),
    ),
    contact: { email: '', address: '' },
    socialLinks: [],
    featuredArticleIds: [],
    featuredCaseIds: [],
    fictional: false,
    categories: [],
  };
  ok(
    await staff.rpc('save_homepage', { payload: settings }),
    'Staff initializes disposable settings',
  );
  for (const name of ['article', 'secondArticle'])
    ok(
      await staff
        .from('articles')
        .update({ status: 'published', featured: true })
        .eq('id', ids[name])
        .select('id')
        .single(),
      `Staff publishes/features ${name}`,
    );
  equal(
    ok(
      await anon.from('articles').select('id').order('display_order'),
      'Published public read',
    ).map((r) => r.id),
    [ids.article, ids.secondArticle],
    'Published only; draft excluded',
  );
  equal(
    ok(
      await anon.from('homepage_settings').select('data').single(),
      'Feature read',
    ).data.featuredArticleIds,
    [ids.article, ids.secondArticle],
    'Feature trigger persists shared selection',
  );
  ok(
    await anon.storage.from('editorial-images').download(imagePath),
    'Published cover real HTTP read',
  );
  const signed = ok(
    await anon.storage.from('editorial-images').createSignedUrl(imagePath, 60),
    'Published cover signing',
  );
  equal(
    (await fetch(signed.signedUrl)).status,
    200,
    'Published signed image downloads',
  );
  const publicResponse = await fetch(
    `${url}/storage/v1/object/public/editorial-images/${imagePath}`,
  );
  assert.notEqual(
    publicResponse.status,
    200,
    'Private bucket public URL must not bypass RLS',
  );
  checks.push('Public-bucket URL cannot bypass private Storage');
  equal(
    ok(
      await ordinary
        .from('articles')
        .update({ status: 'draft' })
        .eq('id', ids.article)
        .select('id'),
      'Ordinary direct edit attempt',
    ).length,
    0,
    'Ordinary cannot mutate published content',
  );
  equal(
    ok(
      await ordinary
        .from('homepage_settings')
        .update({ published: false })
        .eq('id', true)
        .select('id'),
      'Ordinary direct settings attempt',
    ).length,
    0,
    'Ordinary cannot mutate settings',
  );
  for (const [name, status] of [
    ['case', 'published'],
    ['draftCase', 'draft'],
  ])
    ok(
      await staff.from('cases').insert({
        id: ids[name],
        slug: `verification-${ids[name]}`,
        category_id: ids.category,
        status,
        data: {
          title: `${label} ${name}`,
          summary: label,
          body,
          fictional: false,
          reference: label,
          kind: 'Research note',
          setting: label,
          tags: ['Verification only'],
          dateLabel: 'Verification only',
          sourceNote: label,
          supportingDocuments: [],
        },
      }),
      `Staff saves ${name}`,
    );
  for (const [name, status] of [
    ['team', 'published'],
    ['draftTeam', 'draft'],
  ])
    ok(
      await staff.from('team_profiles').insert({
        id: ids[name],
        cover_asset_id: ids.asset,
        status,
        data: {
          label: `${label} ${name}`,
          role: label,
          description: label,
          fictional: false,
        },
      }),
      `Staff saves ${name}`,
    );
  equal(
    ok(await anon.from('cases').select('id'), 'Public case read').map(
      (r) => r.id,
    ),
    [ids.case],
    'Cases persist with draft privacy',
  );
  equal(
    ok(await anon.from('team_profiles').select('id'), 'Public team read').map(
      (r) => r.id,
    ),
    [ids.team],
    'Team persists with draft privacy',
  );
  for (const [name, isPublic] of [
    ['pdf', true],
    ['privatePdf', false],
  ]) {
    const path = `${accounts.staff.id}/${ids[name]}.pdf`;
    const pdf = new TextEncoder().encode(
      '%PDF-1.4\n% VERIFICATION TEST ONLY\n%%EOF',
    );
    paths.push({ bucket: 'case-documents', path });
    saveJournal();
    ok(
      await staff.storage
        .from('case-documents')
        .upload(path, pdf, { contentType: 'application/pdf' }),
      `Staff uploads ${name}`,
    );
    ok(
      await staff.from('editorial_assets').insert({
        id: ids[name],
        path,
        bucket: 'case-documents',
        mime: 'application/pdf',
        bytes: pdf.length,
        label,
      }),
      `PDF metadata ${name}`,
    );
    ok(
      await staff.from('case_documents').insert({
        case_id: ids.case,
        asset_id: ids[name],
        label,
        is_public: isPublic,
      }),
      `Attach ${name}`,
    );
    if (isPublic)
      ok(
        await anon.storage.from('case-documents').download(path),
        'Published case public PDF downloads',
      );
    else
      deny(
        await anon.storage.from('case-documents').download(path),
        'Staff-only case PDF denied anonymously',
      );
  }
  ok(
    await service.from('submissions').insert({
      id: ids.submission,
      category_id: ids.category,
      request_id: ids.request,
      contact_email: `verification-${run}@example.invalid`,
      data: {
        title: label,
        excerpt: label,
        author: label,
        body,
        fictional: false,
      },
    }),
    'Private submission fixture created without public intake',
  );
  const privatePath = `${ids.submission}/${ids.attachment}.pdf`;
  paths.push({ bucket: 'submission-attachments', path: privatePath });
  saveJournal();
  ok(
    await service.storage
      .from('submission-attachments')
      .upload(privatePath, '%PDF-1.4\nVerification only', {
        contentType: 'application/pdf',
      }),
    'Private attachment real upload',
  );
  ok(
    await service
      .from('submission_attachments')
      .insert({ submission_id: ids.submission, path: privatePath, label }),
    'Private attachment metadata',
  );
  for (const client of [anon, ordinary]) {
    equal(
      ok(
        await client.from('submissions').select('id'),
        'Submission privacy read',
      ).length,
      0,
      'Submissions hidden',
    );
    equal(
      ok(
        await client.from('submission_attachments').select('id'),
        'Attachment metadata privacy',
      ).length,
      0,
      'Attachment metadata hidden',
    );
    deny(
      await client.storage.from('submission-attachments').download(privatePath),
      'Private attachment download denied',
    );
    deny(
      await client.rpc('review_submission', {
        submission_id: ids.submission,
        decision: 'approved',
      }),
      'Non-staff review denied',
    );
  }
  ok(
    await staff.storage.from('submission-attachments').download(privatePath),
    'Staff may read private attachment',
  );
  ok(
    await staff.rpc('review_submission', {
      submission_id: ids.submission,
      decision: 'approved',
    }),
    'Staff review workflow',
  );
  const conversions = await Promise.all([
    staff.rpc('convert_submission', { submission_id: ids.submission }),
    staff.rpc('convert_submission', { submission_id: ids.submission }),
  ]);
  converted = ok(conversions[0], 'First conversion');
  ids.converted = converted;
  saveJournal();
  equal(
    ok(conversions[1], 'Concurrent conversion'),
    converted,
    'Concurrent conversions produce one draft',
  );
  equal(
    ok(
      await staff
        .from('articles')
        .select('status')
        .eq('id', converted)
        .single(),
      'Converted draft read',
    ).status,
    'draft',
    'Conversion never publishes',
  );
  ok(
    await staff.from('articles').delete().eq('id', converted),
    'Delete converted fixture',
  );
  deny(
    await staff.rpc('convert_submission', { submission_id: ids.submission }),
    'Conversion tombstone prevents recreation',
  );
  equal(
    ok(await anon.rpc('intake_enabled'), 'Intake gate read'),
    false,
    'Public submissions remain disabled',
  );
  equal(
    sql('select enabled from private.notification_settings where id;')[0]
      .enabled,
    false,
    'Email delivery remains disabled',
  );
  // A freshly initialized browser and separate public session use the regular
  // app without HTTP interception, injected service keys, or fictional providers.
  const contexts = [];
  const context = async (name, viewport = { width: 1440, height: 1000 }) => {
    const c = await browser.newContext({
      viewport,
      ...(name === 'separate-anonymous'
        ? { recordVideo: { dir: folder, size: { width: 1440, height: 1000 } } }
        : {}),
    });
    contexts.push(c);
    await c.addInitScript(() => {
      if (!localStorage.getItem('editorial-motion-choice-made')) {
        localStorage.setItem('editorial-motion-mode', 'reduced');
        localStorage.setItem('editorial-motion-choice-made', '1');
      }
    });
    const p = await c.newPage();
    p.on('pageerror', () => {
      journal.browserError = true;
    });
    return { c, p, name };
  };
  const origin = process.env.VERIFY_APP_ORIGIN ?? 'http://127.0.0.1:5173';
  assert.ok(
    ['http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin),
    'Only approved local app origins',
  );
  const editor = await context('editor');
  await editor.p.goto(`${origin}/admin/login`);
  await editor.p
    .getByLabel('Email', { exact: true })
    .fill(accounts.staff.email);
  await editor.p.getByLabel('Password', { exact: true }).fill(passwords.staff);
  await editor.p.getByRole('button', { name: 'Sign in', exact: true }).click();
  await editor.p
    .getByRole('heading', { name: 'Editorial administration' })
    .waitFor();
  checks.push('Real staff login through existing admin UI');
  await editor.p.goto(`${origin}/admin/articles/${ids.article}`);
  await editor.p
    .getByLabel('Title', { exact: true })
    .fill(`${label} edited in browser`);
  await editor.p
    .getByRole('button', { name: 'Save published content', exact: true })
    .click();
  await editor.p
    .getByText('Saved published to the backend.', { exact: true })
    .waitFor();
  await editor.p.reload();
  equal(
    await editor.p.getByLabel('Title', { exact: true }).inputValue(),
    `${label} edited in browser`,
    'Browser article edit survives reload',
  );
  await editor.p.screenshot({
    path: resolve(folder, 'staff-article-desktop.png'),
    fullPage: true,
  });
  // Upload via the real existing UI; register the generated asset immediately.
  const beforeAssets = new Set(
    ok(
      await service.from('editorial_assets').select('id'),
      'Cover upload baseline',
    ).map((row) => row.id),
  );
  await editor.p
    .getByLabel('Image description / alt text', { exact: true })
    .fill(label);
  await editor.p
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'verification-cover.png',
      mimeType: 'image/png',
      buffer: Buffer.from(image),
    });
  await editor.p
    .getByRole('button', { name: 'Upload to restricted storage', exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await service.from('editorial_assets').select('id')).data?.filter(
          (r) => !beforeAssets.has(r.id),
        ).length ?? 0,
    )
    .toBe(1);
  const added = ok(
    await service.from('editorial_assets').select('id,path,bucket'),
    'Find browser upload',
  ).filter((r) => !beforeAssets.has(r.id));
  for (const row of added) {
    extraAssets.add(row.id);
    paths.push({ bucket: row.bucket, path: row.path });
  }
  await expect(
    editor.p.getByRole('button', {
      name: 'Upload to restricted storage',
      exact: true,
    }),
  ).toBeDisabled();
  saveJournal();
  await editor.p
    .getByRole('button', { name: 'Save published content', exact: true })
    .click();
  await editor.p
    .getByText('Saved published to the backend.', { exact: true })
    .waitFor();
  await expect
    .poll(
      async () =>
        (
          await anon
            .from('articles')
            .select('cover_asset_id')
            .eq('id', ids.article)
            .single()
        ).data?.cover_asset_id,
      { timeout: 15000 },
    )
    .toBe(added[0].id);
  equal(
    ok(
      await anon
        .from('articles')
        .select('cover_asset_id')
        .eq('id', ids.article)
        .single(),
      'Browser cover persistence',
    ).cover_asset_id,
    added[0].id,
    'Browser-uploaded cover persisted on public record',
  );
  // Settings RPC is the same operation used by the existing feature editor.
  const current = ok(
    await staff.from('homepage_settings').select('data,updated_at').single(),
    'Feature order baseline',
  );
  ok(
    await staff.rpc('save_homepage', {
      payload: {
        ...current.data,
        categories: [],
        updatedAt: current.updated_at,
        featuredArticleIds: [ids.article, ids.secondArticle],
        featuredCaseIds: [ids.case],
      },
    }),
    'Persist feature ordering',
  );
  await editor.p.goto(`${origin}/admin/settings`);
  await editor.p
    .getByRole('button', { name: 'Move featured articles 1 down', exact: true })
    .click();
  await editor.p
    .getByLabel('Hero eyebrow', { exact: true })
    .fill(`${label} / saved in browser`);
  await editor.p
    .getByRole('button', { name: 'Save approved settings', exact: true })
    .click();
  await editor.p
    .getByText('Homepage settings saved to the backend.', { exact: true })
    .waitFor();
  await editor.p.reload();
  equal(
    await editor.p.getByLabel('Hero eyebrow', { exact: true }).inputValue(),
    `${label} / saved in browser`,
    'Homepage settings survive browser reload',
  );
  equal(
    ok(
      await anon.from('homepage_settings').select('data').single(),
      'Browser ordered settings',
    ).data.featuredArticleIds,
    [ids.secondArticle, ids.article],
    'Feature ordering saved through actual admin controls',
  );
  const reader = await context('separate-anonymous');
  for (const width of [1440, 768, 390]) {
    await reader.p.setViewportSize({ width, height: 1000 });
    await reader.p.goto(origin);
    await reader.p
      .locator(`[data-selected-article="${ids.secondArticle}"]`)
      .waitFor();
    assert.ok(
      !(await reader.p.locator('body').innerText()).includes(`${label} draft`),
      'Draft must not appear in public browser',
    );
    equal(
      await reader.p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `No public horizontal overflow ${width}`,
    );
    await reader.p.screenshot({
      path: resolve(folder, `public-test-content-${width}.png`),
      fullPage: true,
    });
  }
  checks.push(
    'Feature order appears in separate anonymous browser at 1440/768/390px',
  );
  await reader.p.setViewportSize({ width: 1440, height: 1000 });
  await reader.p.evaluate(() => {
    localStorage.setItem('editorial-motion-mode', 'full');
    sessionStorage.setItem('editorial-intro-seen', '1');
  });
  await reader.p.reload();
  await reader.p
    .locator(
      `.sculpture-stage[data-selected-article="${ids.secondArticle}"][data-webgl="ready"][data-motion="allowed"]`,
    )
    .waitFor();
  await expect
    .poll(() =>
      reader.p
        .locator('.sculpture-static img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image.complete &&
              image.naturalWidth > 0 &&
              image.src.includes('/storage/v1/object/sign/editorial-images/'),
          ),
        ),
    )
    .toBe(true);
  await reader.p.mouse.move(1200, 300);
  await reader.p.waitForLoadState('networkidle');
  await reader.p.screenshot({
    path: resolve(folder, 'public-test-content-full-motion.png'),
    fullPage: true,
  });
  checks.push('Full motion renders actual saved backend cover URLs');
  await reader.p
    .getByRole('button', { name: 'Next research slide', exact: true })
    .click();
  await expect(
    reader.p.getByRole('button', { name: 'Go to slide 2', exact: true }),
  ).toHaveAttribute('aria-current', 'true');
  checks.push('Existing rotating carousel selects real backend articles');
  await reader.p
    .getByRole('button', {
      name: `Select ${label} edited in browser cover`,
      exact: true,
    })
    .click();
  await reader.p.locator(`[data-selected-article="${ids.article}"]`).waitFor();
  await reader.p
    .locator('.hero-art')
    .getByRole('link', { name: /Read article/ })
    .click();
  await reader.p
    .getByRole('heading', { name: `${label} edited in browser`, exact: true })
    .waitFor();
  checks.push('Selected real article opens its own public route');
  await reader.p.reload();
  await reader.p
    .getByRole('heading', { name: `${label} edited in browser`, exact: true })
    .waitFor();
  checks.push('Public article content survives separate-session reload');
  await reader.p.goto(`${origin}/cases/verification-${ids.case}`);
  await reader.p
    .getByRole('heading', { name: `${label} case`, exact: true })
    .waitFor();
  checks.push('Real case route renders');
  await reader.p.goto(`${origin}/team`);
  await reader.p.getByText(`${label} team`, { exact: true }).waitFor();
  checks.push('Real team profile renders');
  const unprivileged = await context('ordinary');
  await unprivileged.p.goto(`${origin}/admin/login`);
  await unprivileged.p
    .getByLabel('Email', { exact: true })
    .fill(accounts.ordinary.email);
  await unprivileged.p
    .getByLabel('Password', { exact: true })
    .fill(passwords.ordinary);
  await unprivileged.p
    .getByRole('button', { name: 'Sign in', exact: true })
    .click();
  await unprivileged.p
    .getByRole('heading', { name: 'Staff access unavailable' })
    .waitFor();
  checks.push('Real ordinary Auth user blocked by admin UI and database');
  // Generate recovery links administratively, without sending any email.
  // No auth URL, token, password, session or trace is written to an artifact.
  for (const host of ['127.0.0.1', 'localhost']) {
    const redirect = `http://${host}:5173/admin/recovery`;
    const recovery = ok(
      await service.auth.admin.generateLink({
        type: 'recovery',
        email: accounts.ordinary.email,
        options: { redirectTo: redirect },
      }),
      `Generate ${host} test recovery link without email`,
    );
    equal(
      new URL(recovery.properties.action_link).searchParams.get('redirect_to'),
      redirect,
      `${host} recovery redirect allowed`,
    );
    const response = await fetch(recovery.properties.action_link, {
      redirect: 'manual',
    });
    assert.ok(
      [302, 303].includes(response.status),
      `${host} Auth verification must redirect`,
    );
    checks.push(`${host} Auth verification redirects`);
    const destination = new URL(response.headers.get('location'));
    equal(
      `${destination.origin}${destination.pathname}`,
      redirect,
      `${host} actual Auth redirect target`,
    );
    equal(
      new URLSearchParams(destination.hash.slice(1)).get('type'),
      'recovery',
      `${host} valid recovery redirect`,
    );
    // Admin-generated links use implicit tokens. The regular app deliberately
    // uses PKCE: its complete email round trip still requires configured SMTP
    // and a request initiated through the existing Forgot password screen.
  }
  for (const name of ['article', 'secondArticle'])
    ok(
      await staff
        .from('articles')
        .update({ status: 'draft' })
        .eq('id', ids[name])
        .select('id')
        .single(),
      `Unpublish ${name}`,
    );
  equal(
    ok(
      await anon.from('homepage_settings').select('data').single(),
      'Pruned features read',
    ).data.featuredArticleIds,
    [],
    'Unpublish removes feature selection',
  );
  await reader.p.goto(origin);
  await reader.p
    .getByText('Featured research is awaiting content.', { exact: true })
    .waitFor();
  equal(
    await reader.p.locator('[data-selected-article]').count(),
    0,
    'Public hero excludes unpublished covers',
  );
  deny(
    await anon.storage.from('editorial-images').download(added[0].path),
    'Cover direct download revoked after unpublish',
  );
  sql(
    `update private.staff_accounts set active=false where user_id='${accounts.staff.id}';`,
  );
  equal(
    ok(await staff.rpc('staff_role'), 'Role after revocation'),
    null,
    'Staff revocation applies to existing JWT',
  );
  equal(
    ok(
      await staff.from('submissions').select('id'),
      'Private read after revocation',
    ).length,
    0,
    'Revoked staff loses private reads',
  );
  assert.ok(!journal.browserError, 'No browser page errors');
  for (const c of contexts) await c.close();
  await reader.p
    .video()
    .saveAs(resolve(folder, 'live-backend-public-interaction.webm'));
  await browser.close();
  browser = null;
  console.log(`${checks.length} live API/browser checks passed on ${ref}.`);
} finally {
  if (browser) await browser.close();
  // Cleanup exact recorded UUIDs/paths only. Keep operational audit events.
  const clean = (r, label) => {
    if (r.error) cleanupError = label;
  };
  // Recover even an upload whose browser success assertion was interrupted.
  if (accounts.staff) {
    const assets = await service
      .from('editorial_assets')
      .select('id,path,bucket')
      .like('path', `${accounts.staff.id}/%`);
    for (const asset of assets.data ?? []) {
      extraAssets.add(asset.id);
      paths.push({ bucket: asset.bucket, path: asset.path });
    }
    for (const bucket of ['editorial-images', 'case-documents']) {
      const objects = await service.storage
        .from(bucket)
        .list(accounts.staff.id);
      for (const object of objects.data ?? [])
        paths.push({ bucket, path: `${accounts.staff.id}/${object.name}` });
    }
  }
  for (const name of ['article', 'secondArticle', 'draft', 'converted'])
    if (ids[name])
      clean(
        await service.from('articles').delete().eq('id', ids[name]),
        `article ${name}`,
      );
  for (const name of ['case', 'draftCase'])
    clean(await service.from('cases').delete().eq('id', ids[name]), name);
  for (const name of ['team', 'draftTeam'])
    clean(
      await service.from('team_profiles').delete().eq('id', ids[name]),
      name,
    );
  clean(
    await service.from('submissions').delete().eq('id', ids.submission),
    'submission',
  );
  // Settings belong to this run only, protected by its exact unique introduction.
  clean(
    await service
      .from('homepage_settings')
      .delete()
      .eq('data->hero->>introduction', label),
    'test settings',
  );
  for (const asset of [ids.asset, ids.pdf, ids.privatePdf, ...extraAssets])
    clean(
      await service.from('editorial_assets').delete().eq('id', asset),
      'asset',
    );
  clean(await service.from('authors').delete().eq('id', ids.author), 'author');
  clean(
    await service.from('categories').delete().eq('id', ids.category),
    'category',
  );
  for (const item of paths)
    clean(
      await service.storage.from(item.bucket).remove([item.path]),
      'storage',
    );
  for (const id of users)
    clean(await service.auth.admin.deleteUser(id), 'Auth account');
  journal.cleaned = !cleanupError;
  journal.cleanupError = cleanupError;
  journal.retainedAuditEvents = ok(
    await service.from('content_activity').select('id'),
    'Audit count',
  ).filter((row) => !baselineActivity.has(row.id)).length;
  saveJournal();
  for (const client of [anon, ordinary, staff, service])
    client.auth.stopAutoRefresh();
  assert.ok(
    !cleanupError,
    `Fixture cleanup requires attention: ${cleanupError}`,
  );
}
