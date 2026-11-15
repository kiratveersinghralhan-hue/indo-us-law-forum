import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
// LOCAL ONLY. Requires an explicitly provisioned dedicated local stack/accounts.
// Credentials are process variables, never logged, persisted or sent elsewhere.
const url = process.env.LOCAL_SUPABASE_URL;
if (
  !url ||
  !['localhost', '127.0.0.1'].includes(new URL(url).hostname) ||
  process.env.LOCAL_TEST_PROJECT_CONFIRMED !== 'dilraj-editorial'
)
  throw Error(
    'Dedicated local stack and LOCAL_TEST_PROJECT_CONFIRMED=dilraj-editorial are required. Remote execution is prohibited.',
  );
const anonKey = process.env.LOCAL_PUBLISHABLE_KEY,
  serviceKey = process.env.LOCAL_SERVICE_KEY;
if (
  !anonKey ||
  !serviceKey ||
  !process.env.LOCAL_STAFF_EMAIL ||
  !process.env.LOCAL_STAFF_PASSWORD ||
  !process.env.LOCAL_ORDINARY_EMAIL ||
  !process.env.LOCAL_ORDINARY_PASSWORD
)
  throw Error(
    'Configure local test accounts/keys securely in process environment. Do not paste them into chat.',
  );
const make = (key) =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { timeout: 10000, retry: false },
  });
const anon = make(anonKey),
  ordinary = make(anonKey),
  staff = make(anonKey),
  service = make(serviceKey);
const marker = await anon.rpc('backend_project_marker');
assert.equal(
  marker.data,
  'dilraj-editorial-v1',
  'Dedicated editorial schema marker required before writes',
);
for (const [client, prefix] of [
  [ordinary, 'ORDINARY'],
  [staff, 'STAFF'],
]) {
  const r = await client.auth.signInWithPassword({
    email: process.env[`LOCAL_${prefix}_EMAIL`],
    password: process.env[`LOCAL_${prefix}_PASSWORD`],
  });
  assert.equal(
    r.error,
    null,
    `Local ${prefix.toLowerCase()} sign-in must work`,
  );
}
assert.equal((await ordinary.rpc('staff_role')).data, null);
assert.ok(['editor', 'admin'].includes((await staff.rpc('staff_role')).data));
const category = crypto.randomUUID(),
  author = crypto.randomUUID(),
  asset = crypto.randomUUID(),
  article = crypto.randomUUID(),
  submission = crypto.randomUUID();
const user = (await staff.auth.getUser()).data.user;
assert.ok(user);
const imagePath = `${user.id}/${asset}.png`,
  privatePath = `${submission}/${crypto.randomUUID()}.pdf`;
const image = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
    'base64',
  ),
);
let converted = null,
  checks = 0;
const ok = (r, label) => {
  assert.equal(r.error, null, label);
  checks++;
  return r.data;
};
const denied = (r, label) => {
  assert.ok(r.error, label);
  checks++;
};
try {
  ok(
    await staff
      .from('categories')
      .insert({
        id: category,
        label: 'LOCAL HTTP TEST',
        description: 'Local test only',
        published: true,
      }),
    'Staff category create',
  );
  ok(
    await staff
      .from('authors')
      .insert({
        id: author,
        label: 'LOCAL HTTP TEST',
        description: 'Local test only',
        published: true,
      }),
    'Staff author create',
  );
  ok(
    await staff.storage
      .from('editorial-images')
      .upload(imagePath, image, { contentType: 'image/png', upsert: false }),
    'Staff image upload',
  );
  ok(
    await staff
      .from('editorial_assets')
      .insert({
        id: asset,
        path: imagePath,
        bucket: 'editorial-images',
        label: 'LOCAL HTTP TEST',
        mime: 'image/png',
        bytes: image.length,
      }),
    'Staff asset metadata',
  );
  ok(
    await staff
      .from('articles')
      .insert({
        id: article,
        slug: `local-http-${article}`,
        category_id: category,
        author_id: author,
        cover_asset_id: asset,
        status: 'draft',
        data: {
          title: 'LOCAL HTTP TEST',
          summary: 'Local test only',
          fictional: false,
          body: [{ type: 'paragraph', text: 'Local test only' }],
        },
      }),
    'Staff draft create',
  );
  assert.equal(
    ok(
      await anon.from('articles').select('id').eq('id', article),
      'Anonymous draft query',
    ).length,
    0,
  );
  assert.equal(
    ok(
      await ordinary.from('articles').select('id').eq('id', article),
      'Ordinary draft query',
    ).length,
    0,
  );
  denied(
    await anon.storage.from('editorial-images').download(imagePath),
    'Anonymous draft image denied',
  );
  const ordinaryId = (await ordinary.auth.getUser()).data.user.id;
  denied(
    await ordinary.storage
      .from('editorial-images')
      .upload(`${ordinaryId}/${crypto.randomUUID()}.png`, image, {
        contentType: 'image/png',
      }),
    'Ordinary upload denied',
  );
  denied(
    await ordinary
      .schema('private')
      .from('staff_accounts')
      .insert({ user_id: ordinaryId, role: 'admin' }),
    'Ordinary self-provision denied',
  );
  ok(
    await ordinary.auth.updateUser({ data: { role: 'admin', is_staff: true } }),
    'User metadata remains self-editable',
  );
  assert.equal(
    (await ordinary.rpc('staff_role')).data,
    null,
    'Metadata cannot confer staff access',
  );
  denied(
    await staff.storage
      .from('editorial-images')
      .upload(
        `${user.id}/${crypto.randomUUID()}.txt`,
        new TextEncoder().encode('test'),
        { contentType: 'text/plain' },
      ),
    'Server rejects unsupported MIME',
  );
  denied(
    await staff.storage
      .from('editorial-images')
      .upload(
        `${user.id}/${crypto.randomUUID()}.png`,
        new Uint8Array(3145729),
        { contentType: 'image/png' },
      ),
    'Server rejects oversized image',
  );
  ok(
    await staff
      .from('articles')
      .update({ status: 'published' })
      .eq('id', article),
    'Staff publish',
  );
  assert.equal(
    ok(
      await anon.from('articles').select('id').eq('id', article),
      'Anonymous published query',
    ).length,
    1,
  );
  ok(
    await anon.storage.from('editorial-images').download(imagePath),
    'Anonymous published image read',
  );
  ok(
    await staff.from('articles').update({ status: 'draft' }).eq('id', article),
    'Staff unpublish',
  );
  assert.equal(
    ok(
      await anon.from('articles').select('id').eq('id', article),
      'Anonymous unpublished query',
    ).length,
    0,
  );
  denied(
    await anon.storage.from('editorial-images').download(imagePath),
    'Direct image access denied after unpublish',
  );
  ok(
    await service
      .from('submissions')
      .insert({
        id: submission,
        category_id: category,
        contact_email: 'local-http@example.invalid',
        request_id: crypto.randomUUID(),
        data: {
          title: 'LOCAL HTTP TEST',
          excerpt: 'Local test only',
          author: 'Local test only',
          body: [{ type: 'paragraph', text: 'Local test only' }],
          fictional: false,
        },
      }),
    'Service creates private local fixture',
  );
  ok(
    await service.storage
      .from('submission-attachments')
      .upload(
        privatePath,
        new TextEncoder().encode('%PDF-1.4\nLocal test only'),
        { contentType: 'application/pdf' },
      ),
    'Service creates private attachment',
  );
  ok(
    await service
      .from('submission_attachments')
      .insert({
        submission_id: submission,
        path: privatePath,
        label: 'Local test only',
      }),
    'Service attachment metadata',
  );
  for (const client of [anon, ordinary]) {
    assert.equal(
      ok(
        await client.from('submissions').select('id').eq('id', submission),
        'Private submission query',
      ).length,
      0,
    );
    denied(
      await client.storage.from('submission-attachments').download(privatePath),
      'Private attachment denied',
    );
  }
  ok(
    await staff.storage.from('submission-attachments').download(privatePath),
    'Staff private attachment read',
  );
  ok(
    await staff.rpc('review_submission', {
      submission_id: submission,
      decision: 'approved',
    }),
    'Staff review',
  );
  const [first, second] = await Promise.all([
    staff.rpc('convert_submission', { submission_id: submission }),
    staff.rpc('convert_submission', { submission_id: submission }),
  ]);
  converted = ok(first, 'First concurrent conversion');
  assert.equal(ok(second, 'Second concurrent conversion'), converted);
  const draft = ok(
    await staff.from('articles').select('status').eq('id', converted).single(),
    'Converted article lookup',
  );
  assert.equal(draft.status, 'draft');
  ok(
    await staff.from('articles').delete().eq('id', converted),
    'Delete converted draft',
  );
  denied(
    await staff.rpc('convert_submission', { submission_id: submission }),
    'Conversion tombstone prevents recreation',
  );
  console.log(
    `${checks} local HTTP/Auth/CRUD/Storage assertions completed. No hosted or physical-device evidence.`,
  );
} finally {
  // Delete only the UUIDs/paths created by this test; never reset another project.
  if (converted) await service.from('articles').delete().eq('id', converted);
  await service.from('articles').delete().eq('id', article);
  await service.from('submissions').delete().eq('id', submission);
  await service.from('editorial_assets').delete().eq('id', asset);
  await service.from('authors').delete().eq('id', author);
  await service.from('categories').delete().eq('id', category);
  await service.storage.from('editorial-images').remove([imagePath]);
  await service.storage.from('submission-attachments').remove([privatePath]);
  for (const client of [anon, ordinary, staff, service])
    client.auth.stopAutoRefresh();
}
