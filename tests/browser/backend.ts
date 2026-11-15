import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { researchCategories } from '../../src/config/research-categories';
import { defaultSiteSettings } from '../../src/data/site-settings';
import { chooseExperience } from './experience-controls';

// Actual admin/public UI, intercepted HTTP transport. NOT Auth/RLS/Storage proof.
async function fakeBackend(
  page: Page,
  role: 'editor' | null = 'editor',
  failReads = false,
  backendOrigin = 'http://127.0.0.1:54321',
) {
  await page.addInitScript(() => {
    localStorage.setItem('editorial-motion-mode', 'reduced');
    localStorage.setItem('editorial-motion-choice-made', '1');
  });
  const records: Record<string, Record<string, unknown>[]> = {
    categories: researchCategories.map((c, index) => ({
      id: `33333333-3333-4333-8333-33333333333${index + 3}`,
      label: c.label,
      description: c.description,
      published: true,
    })),
    authors: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        label: 'Approved author',
        description: 'Approved biography',
        published: true,
      },
    ],
    homepage_settings: [],
    articles: [],
    cases: [],
    team_profiles: [],
    submissions: [],
    content_activity: [],
    editorial_assets: [],
  };
  await page.context().route(`${backendOrigin}/**`, async (route) => {
    const url = new URL(route.request().url()),
      method = route.request().method();
    if (url.pathname === '/auth/v1/token') {
      const now = Math.floor(Date.now() / 1000);
      const jwt = [
        btoa(JSON.stringify({ alg: 'HS256' })),
        btoa(
          JSON.stringify({
            sub: '22222222-2222-4222-8222-222222222222',
            role: 'authenticated',
            aud: 'authenticated',
            iat: now,
            exp: now + 3600,
          }),
        ),
        'transport-fake-signature',
      ].join('.');
      return route.fulfill({
        json: {
          access_token: jwt,
          refresh_token: 'transport-test-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: '22222222-2222-4222-8222-222222222222',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'staff@example.invalid',
            app_metadata: { provider: 'email', providers: ['email'] },
            user_metadata: {},
            created_at: '2026-10-06T00:00:00Z',
          },
        },
      });
    }
    if (url.pathname === '/auth/v1/user')
      return route.fulfill({
        json: {
          id: '22222222-2222-4222-8222-222222222222',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'staff@example.invalid',
          app_metadata: { provider: 'email' },
          user_metadata: {},
        },
      });
    if (url.pathname.startsWith('/auth/')) return route.fulfill({ json: {} });
    if (url.pathname.endsWith('/rpc/staff_role'))
      return route.fulfill({ json: role });
    if (url.pathname.endsWith('/rpc/dashboard_counts'))
      return route.fulfill({
        json: {
          drafts: records.articles.filter((r) => r.status === 'draft').length,
          published: records.articles.filter((r) => r.status === 'published')
            .length,
          pending: records.submissions.filter((r) => r.status === 'pending')
            .length,
          cases: records.cases.length,
        },
      });
    if (url.pathname.endsWith('/rpc/intake_enabled'))
      return route.fulfill({ json: false });
    const table = url.pathname.split('/').at(-1)!;
    if (!(table in records))
      return route.fulfill({
        status: 500,
        json: { message: 'Unexpected test request' },
      });
    if (failReads && table === 'articles')
      return route.fulfill({
        status: 503,
        json: { message: 'Test backend unavailable' },
      });
    if (method === 'POST') {
      const incoming = route.request().postDataJSON();
      const saved = {
        ...incoming,
        id: incoming.id ?? crypto.randomUUID(),
        updated_at: new Date().toISOString(),
      };
      records[table].push(saved);
      return route.fulfill({
        json: route.request().headers().accept?.includes('vnd.pgrst.object')
          ? saved
          : [saved],
      });
    }
    let rows = records[table];
    for (const [key, value] of url.searchParams)
      if (value.startsWith('eq.'))
        rows = rows.filter((r) => String(r[key]) === value.slice(3));
    if (method === 'PATCH')
      for (const row of rows)
        Object.assign(row, route.request().postDataJSON(), {
          updated_at: new Date(Date.now() + 1).toISOString(),
        });
    return route.fulfill({ json: rows });
  });
  return records;
}
for (const width of [390, 768, 1440])
  test(`backend staff UI, real editor and draft save ${width}px (HTTP mocked)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const records = await fakeBackend(page);
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { name: 'Staff sign-in' }),
    ).toBeVisible();
    await page
      .getByLabel('Email', { exact: true })
      .fill('staff@example.invalid');
    await page
      .getByLabel('Password', { exact: true })
      .fill('fictional-test-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Editorial administration' }),
    ).toBeVisible();
    await expect(
      page.getByText('Analytics not connected', { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Admin', exact: true })
      .getByRole('link', { name: 'Articles', exact: true })
      .click();
    await page.getByRole('link', { name: /Create/ }).click();
    await page
      .getByLabel('Title', { exact: true })
      .fill('Approved transport test');
    await page
      .getByLabel('Slug', { exact: true })
      .fill('approved-transport-test');
    await page.getByLabel('Excerpt', { exact: true }).fill('Approved summary');
    await page
      .getByRole('textbox', { name: 'Article or case content' })
      .fill('Structured draft content.');
    await page
      .getByLabel('Approved author', { exact: true })
      .selectOption('44444444-4444-4444-8444-444444444444');
    await page.getByLabel('Publication label').fill('6 October 2026');
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Saved draft to the backend.' }),
    ).toBeVisible();
    expect(records.articles).toHaveLength(1);
    expect(records.articles[0].status).toBe('draft');
    expect((records.articles[0].data as { fictional: boolean }).fictional).toBe(
      false,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
test('ordinary account is denied; no frontend self-provisioning', async ({
  page,
}) => {
  await fakeBackend(page, null);
  await page.goto('/admin/login');
  await page
    .getByLabel('Email', { exact: true })
    .fill('ordinary@example.invalid');
  await page
    .getByLabel('Password', { exact: true })
    .fill('fictional-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Staff access unavailable' }),
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Admin', exact: true }),
  ).toHaveCount(0);
});
test('backend read errors never show sample records; intake stays disabled', async ({
  page,
}) => {
  await fakeBackend(page, 'editor', true);
  await page.goto('/articles');
  await expect(
    page.getByRole('heading', { name: 'Content could not be loaded.' }),
  ).toBeVisible();
  await expect(page.locator('.article-card')).toHaveCount(0);
  await page.goto('/submit');
  await expect(
    page
      .locator('.state-panel')
      .filter({ hasText: 'Submissions are not accepting delivery.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send for private review' }),
  ).toHaveCount(0);
  await expect(page.getByLabel('PDF version', { exact: true })).toBeDisabled();
  await expect(page.getByLabel('Word version', { exact: true })).toBeDisabled();
});

test('empty backend publication source has a neutral cover and no fictional article fallback (HTTP mocked)', async ({
  page,
}) => {
  const records = await fakeBackend(page);
  records.homepage_settings = [
    {
      id: true,
      published: true,
      updated_at: '2026-10-10T00:00:00Z',
      data: {
        ...defaultSiteSettings,
        fictional: false,
        featuredArticleIds: [],
        featuredCaseIds: [],
      },
    },
  ];
  await page.goto('/');
  await expect(page.locator('.publication-caption')).toContainText(
    'next edition is in preparation',
  );
  await expect(
    page.locator(
      '.publication-selectors button, .publication-caption a, .carousel-slide, .orbit-cover',
    ),
  ).toHaveCount(0);
  await expect(page.locator('.static-volume img')).toHaveAttribute(
    'src',
    '/artwork/publication-neutral.svg',
  );
  await expect(page.locator('.publication-caption')).not.toContainText(
    'Sample article',
  );
  await expect(page.locator('.demo-store-error')).toHaveCount(0);
});

test('confirmed categories retain backend UUIDs while public filters use stable slugs (HTTP mocked)', async ({
  page,
}) => {
  await fakeBackend(page);
  await page.goto('/articles');
  for (const c of researchCategories) {
    await page.getByLabel('Filter by category').selectOption(c.id);
    await expect(page).toHaveURL(new RegExp(`category=${c.id}`));
    await expect(
      page.locator('#article-category option').filter({ hasText: c.label }),
    ).toHaveCount(1);
  }
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill('staff@example.invalid');
  await page
    .getByLabel('Password', { exact: true })
    .fill('transport-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Editorial administration' }),
  ).toBeVisible();
  await page.goto('/admin/articles/new');
  for (let i = 0; i < researchCategories.length; i++)
    await expect(
      page.locator(
        `#categoryId option[value="33333333-3333-4333-8333-33333333333${i + 3}"]`,
      ),
    ).toHaveText(researchCategories[i].label);
});

test('an already-open public page refreshes homepage settings on focus and reload without inheriting an Auth email (HTTP mocked)', async ({
  page,
}) => {
  const records = await fakeBackend(page);
  const initial = {
    ...structuredClone(defaultSiteSettings),
    hero: {
      ...defaultSiteSettings.hero,
      lines: ['First published title', 'Research continues', 'Across borders'],
    },
    fictional: false,
    featuredArticleIds: [],
    featuredCaseIds: [],
  };
  records.homepage_settings = [
    {
      id: true,
      published: true,
      updated_at: '2026-10-10T00:00:00Z',
      data: initial,
    },
  ];
  await page.goto('/');
  await expect(page.locator('#hero-heading')).toContainText(
    'First published title',
  );
  initial.hero.lines[0] = 'Updated through another staff session';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#hero-heading')).toContainText(
    'Updated through another staff session',
  );
  await page.reload();
  await expect(page.locator('#hero-heading')).toContainText(
    'Updated through another staff session',
  );
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('staff@example.invalid');
});

async function signedImageFixture(page: Page, draft = false) {
  const records = await fakeBackend(page);
  const id = '55555555-5555-4555-8555-555555555555';
  records.editorial_assets = [
    {
      id,
      bucket: 'editorial-images',
      path: 'test/cover.png',
      label: 'TEST ONLY renewable cover',
    },
  ];
  records.articles = [
    {
      id: '66666666-6666-4666-8666-666666666666',
      slug: 'signed-image-test-only',
      category_id: records.categories[0].id,
      author_id: records.authors[0].id,
      cover_asset_id: id,
      status: draft ? 'draft' : 'published',
      featured: false,
      display_order: 0,
      updated_at: '2026-10-10T00:00:00Z',
      data: {
        title: 'SIGNED IMAGE TEST ONLY',
        summary: 'Test only summary',
        body: [{ type: 'paragraph', text: 'Test only body' }],
        artwork: 'institutions',
        readingMinutes: 2,
        publicationLabel: 'Test only',
        fictional: false,
      },
    },
  ];
  let signatures = 0,
    denied = false;
  await page.route('http://127.0.0.1:54321/storage/v1/**', (route) => {
    if (route.request().method() === 'POST') {
      signatures++;
      return route.fulfill(
        denied
          ? { status: 403, json: { message: 'Test signing denied' } }
          : {
              json: {
                signedURL: `/object/sign/editorial-images/test/cover.png?token=test-${signatures}`,
              },
            },
      );
    }
    return route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      ),
    });
  });
  await page.clock.install();
  return {
    count: () => signatures,
    deny: () => {
      denied = true;
    },
  };
}

test('signed public article cover renews before expiry and on return from a hidden tab (HTTP mocked)', async ({
  page,
}) => {
  const f = await signedImageFixture(page);
  await page.goto('/articles/signed-image-test-only');
  const cover = page.locator('.detail-art img');
  await expect(cover).toHaveAttribute('src', /token=test-1/);
  await page.clock.fastForward(241_000);
  await expect(cover).toHaveAttribute('src', /token=test-2/);
  expect(f.count()).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(601_000);
  expect(f.count()).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await expect(cover).toHaveAttribute('src', /token=test-3/);
  expect(f.count()).toBe(3);
});

test('private admin preview recovers image failures without resetting dirty edits or looping on denial (HTTP mocked)', async ({
  page,
}) => {
  const f = await signedImageFixture(page, true);
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill('staff@example.invalid');
  await page
    .getByLabel('Password', { exact: true })
    .fill('transport-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Editorial administration' }),
  ).toBeVisible();
  await page.goto('/admin/articles/66666666-6666-4666-8666-666666666666');
  const cover = page.locator('.admin-cover img');
  await expect(cover).toHaveAttribute('src', /token=test-\d+/);
  await page.getByLabel('Title', { exact: true }).fill('UNSAVED TEST ONLY');
  const before = f.count();
  await page.clock.fastForward(31_000);
  await cover.evaluate((node) => {
    for (let i = 0; i < 5; i++) node.dispatchEvent(new Event('error'));
  });
  await expect(cover).toHaveAttribute(
    'src',
    new RegExp(`token=test-${before + 1}`),
  );
  expect(f.count()).toBe(before + 1);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'UNSAVED TEST ONLY',
  );
  f.deny();
  await page.clock.fastForward(31_000);
  await cover.evaluate((node) => node.dispatchEvent(new Event('error')));
  await expect(cover).toHaveAttribute(
    'src',
    '/artwork/publication-neutral.svg',
  );
  await page.clock.fastForward(601_000);
  expect(f.count()).toBe(before + 2);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'UNSAVED TEST ONLY',
  );
});

async function openArticleEditor(page: Page) {
  const records = await fakeBackend(page);
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill('staff@example.invalid');
  await page
    .getByLabel('Password', { exact: true })
    .fill('fictional-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Admin', exact: true })
    .getByRole('link', { name: 'Articles', exact: true })
    .click();
  await page.getByRole('link', { name: /Create/ }).click();
  await page
    .getByLabel('Title', { exact: true })
    .fill('EDITOR REGRESSION TEST ONLY');
  await page
    .getByLabel('Slug', { exact: true })
    .fill('editor-regression-test-only');
  await page
    .getByLabel('Excerpt', { exact: true })
    .fill('Local intercepted transport fixture.');
  await page.getByLabel('Publication label', { exact: true }).fill('TEST ONLY');
  await page
    .getByRole('textbox', { name: 'Article or case content' })
    .waitFor();
  return records;
}
async function pasteEditor(page: Page, html: string) {
  const input = page.getByRole('textbox', { name: 'Article or case content' });
  await input.fill('');
  await input.evaluate((element, html) => {
    const data = new DataTransfer();
    data.setData('text/html', html);
    element.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, html);
}
const testPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);
async function chooseTestCover(page: Page) {
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({
    name: 'TEST-ONLY-cover.png',
    mimeType: 'image/png',
    buffer: testPNG,
  });
  await page
    .getByLabel('Image description / alt text', { exact: true })
    .fill('TEST ONLY editorial cover');
}
async function imageTransport(
  page: Page,
  backendOrigin = 'http://127.0.0.1:54321',
) {
  let posts = 0,
    fail = false,
    held: Promise<void> | undefined,
    release = () => {};
  await page
    .context()
    .route(`${backendOrigin}/storage/v1/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.includes('/object/sign/') && route.request().method() === 'POST')
        return route.fulfill({
          json: {
            signedURL:
              '/object/sign/editorial-images/test-only.png?token=fixture',
          },
        });
      if (route.request().method() === 'GET')
        return route.fulfill({ contentType: 'image/png', body: testPNG });
      posts++;
      if (held) await held;
      return route.fulfill(
        fail
          ? {
              status: 403,
              json: {
                statusCode: '403',
                message:
                  'new row violates row-level security secret=DO-NOT-DISPLAY',
              },
            }
          : {
              json: {
                Key: 'editorial-images/test-only.png',
                Id: crypto.randomUUID(),
              },
            },
      );
    });
  return {
    count: () => posts,
    deny: (value: boolean) => {
      fail = value;
    },
    hold: () => {
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    release: () => {
      release();
      held = undefined;
    },
  };
}
test('editor fixes: locate empty bullet, preserve paragraphs and save draft without author (HTTP mocked)', async ({
  page,
}) => {
  const records = await openArticleEditor(page);
  await pasteEditor(
    page,
    '<p>Introduction</p><ul><li><p></p></li></ul><p>First following paragraph.</p><p>Second following paragraph.</p>',
  );
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  const problem = page
    .locator('#body-errors')
    .getByRole('button', { name: /Content block 2, bullet 1 is empty/ });
  await expect(problem).toBeVisible();
  expect(records.articles).toHaveLength(0);
  await problem.click();
  await page.keyboard.insertText('Corrected bullet');
  await expect(page.locator('#body-errors')).toBeEmpty();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved draft to the backend.' }),
  ).toBeVisible();
  expect(records.articles[0].author_id).toBeNull();
  expect((records.articles[0].data as { body: unknown }).body).toEqual([
    { type: 'paragraph', text: 'Introduction' },
    { type: 'list', items: ['Corrected bullet'] },
    { type: 'paragraph', text: 'First following paragraph.' },
    { type: 'paragraph', text: 'Second following paragraph.' },
  ]);
  await page.goto(`/admin/articles/${records.articles[0].id}`);
  await expect(
    page.getByRole('textbox', { name: 'Article or case content' }),
  ).toContainText('Second following paragraph.');
});
test('editor fixes: length, paragraph-only draft and publication fields (HTTP mocked)', async ({
  page,
}) => {
  const records = await openArticleEditor(page);
  await pasteEditor(
    page,
    `<ul><li><p>${'x'.repeat(6001)}</p></li><li><p>Valid second bullet</p></li></ul>`,
  );
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#body-errors')).toContainText(
    '6001 characters; the limit is 6000',
  );
  expect(records.articles).toHaveLength(0);
  await pasteEditor(page, '<p>Paragraph only.</p><p></p>');
  await page
    .getByRole('button', { name: 'Publish approved content', exact: true })
    .click();
  await expect(page.locator('#author-id-error')).toContainText(
    'Choose an approved author',
  );
  await expect(
    page.getByRole('region', { name: 'Errors to resolve' }),
  ).toContainText('Upload an editorial cover');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved draft to the backend.' }),
  ).toBeVisible();
  expect((records.articles[0].data as { body: unknown }).body).toEqual([
    { type: 'paragraph', text: 'Paragraph only.' },
  ]);
});
for (const width of [390, 1440])
  test(`editor fixes: upload pending, denial, retry, persisted and public cover ${width}px (HTTP mocked)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    const records = await openArticleEditor(page),
      storage = await imageTransport(page);
    await pasteEditor(
      page,
      '<ul><li><p>First valid bullet</p></li><li><p>Second valid bullet</p></li></ul><p>Following paragraph.</p>',
    );
    await page.getByLabel('Choose image', { exact: true }).setInputFiles({
      name: 'TEST-ONLY-cover.png',
      mimeType: 'image/png',
      buffer: testPNG,
    });
    await page
      .getByRole('button', {
        name: 'Upload to restricted storage',
        exact: true,
      })
      .click();
    await expect(page.locator('#asset-label-image-error')).toContainText(
      'required',
    );
    await page
      .getByRole('button', { name: 'Dismiss error', exact: true })
      .click();
    await expect(page.locator('.editor-error-toast')).toHaveCount(0);
    await page
      .getByLabel('Image description / alt text', { exact: true })
      .fill('TEST ONLY editorial cover');
    storage.hold();
    storage.deny(true);
    await page
      .getByRole('button', { name: 'Retry upload', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Uploading…', exact: true }),
    ).toBeDisabled();
    await expect(page.locator('.editorial-upload-spinner')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Save draft', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', {
        name: 'Publish approved content',
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      page.getByText('Upload pending — keep this page open.', { exact: true }),
    ).toBeVisible();
    storage.release();
    await expect(page.locator('.editor-error-toast')).toContainText(
      'active editorial access',
    );
    await expect(page.locator('.editor-error-toast')).not.toContainText(
      'DO-NOT-DISPLAY',
    );
    const position = await page
      .locator('.editor-error-toast')
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        return {
          bottom: innerHeight - r.bottom,
          center: r.x + r.width / 2,
          window: innerWidth,
        };
      });
    expect(position.bottom).toBeLessThanOrEqual(25);
    if (width === 390)
      expect(Math.abs(position.center - position.window / 2)).toBeLessThan(2);
    await page.screenshot({
      path: `.qa/article-editor/upload-error-${width}.png`,
      fullPage: false,
    });
    await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
      'EDITOR REGRESSION TEST ONLY',
    );
    expect(
      await page
        .getByLabel('Choose image', { exact: true })
        .evaluate((el: HTMLInputElement) => el.files?.[0]?.name),
    ).toBe('TEST-ONLY-cover.png');
    storage.deny(false);
    await page
      .getByRole('button', { name: 'Retry upload', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Uploaded', exact: true }),
    ).toBeDisabled();
    expect(storage.count()).toBe(2);
    await expect(page.locator('.admin-cover img')).toHaveAttribute(
      'src',
      /token=fixture/,
    );
    await expect(page.locator('.editorial-upload-feedback')).toContainText(
      'Save the article or profile',
    );
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Saved draft to the backend.' }),
    ).toBeVisible();
    expect(records.articles[0].cover_asset_id).toBe(
      records.editorial_assets[0].id,
    );
    expect(
      (records.articles[0].data as Record<string, unknown>).coverUrl,
    ).toBeUndefined();
    await page.goto(`/admin/articles/${records.articles[0].id}`);
    await expect(page.locator('.admin-cover img')).toHaveAttribute(
      'src',
      /token=fixture/,
    );
    await page
      .getByLabel('Approved author', { exact: true })
      .selectOption(String(records.authors[0].id));
    await page
      .getByRole('button', { name: 'Publish approved content', exact: true })
      .click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Saved published to the backend.' }),
    ).toBeVisible();
    await page.goto('/articles/editor-regression-test-only');
    await expect(page.locator('.detail-art img')).toHaveAttribute(
      'src',
      /token=fixture/,
    );
    await expect(page.locator('.detail-art img')).toBeVisible();
  });
test('editor fixes: unsupported/oversized file, expired session and retry preserve selection (HTTP mocked)', async ({
  page,
}) => {
  await openArticleEditor(page);
  const storage = await imageTransport(page);
  await page
    .getByLabel('Image description / alt text', { exact: true })
    .fill('TEST ONLY');
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({
    name: 'bad.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await page
    .getByRole('button', { name: 'Upload to restricted storage', exact: true })
    .click();
  await expect(page.locator('.editor-error-toast')).toContainText(
    'format is unsupported',
  );
  expect(storage.count()).toBe(0);
  await page.getByLabel('Choose image', { exact: true }).setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(3145729),
  });
  await page
    .getByRole('button', { name: 'Upload to restricted storage', exact: true })
    .click();
  await expect(page.locator('.editor-error-toast')).toContainText(
    '3145729 bytes; the limit is 3145728',
  );
  expect(storage.count()).toBe(0);
  await chooseTestCover(page);
  await page.route('http://127.0.0.1:54321/auth/v1/user', (route) =>
    route.fulfill({
      status: 401,
      json: { message: 'JWT expired secret=DO-NOT-DISPLAY' },
    }),
  );
  await page
    .getByRole('button', { name: 'Upload to restricted storage', exact: true })
    .click();
  await expect(page.locator('.editor-error-toast')).toContainText(
    'session could not be verified',
  );
  expect(storage.count()).toBe(0);
  await page.unroute('http://127.0.0.1:54321/auth/v1/user');
  await page.getByRole('button', { name: 'Retry upload', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Uploaded', exact: true }),
  ).toBeVisible();
});
test('editor fixes: retry finishes partial metadata persistence without duplicating storage (HTTP mocked)', async ({
  page,
}) => {
  const records = await openArticleEditor(page),
    storage = await imageTransport(page);
  await chooseTestCover(page);
  let deny = true;
  await page.route(
    'http://127.0.0.1:54321/rest/v1/editorial_assets**',
    (route) => {
      if (deny && route.request().method() === 'POST')
        return route.fulfill({
          status: 503,
          json: { message: 'DO-NOT-DISPLAY reference error' },
        });
      return route.fallback();
    },
  );
  await page
    .getByRole('button', { name: 'Upload to restricted storage', exact: true })
    .click();
  await expect(page.locator('.editor-error-toast')).toContainText(
    'file was uploaded',
  );
  expect(storage.count()).toBe(1);
  expect(records.editorial_assets).toHaveLength(0);
  deny = false;
  await page.getByRole('button', { name: 'Retry upload', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Uploaded', exact: true }),
  ).toBeVisible();
  expect(storage.count()).toBe(1);
  expect(records.editorial_assets).toHaveLength(1);
});
test('editor fixes: server save failures preserve edits and identify duplicate slug (HTTP mocked)', async ({
  page,
}) => {
  const records = await openArticleEditor(page);
  await pasteEditor(
    page,
    '<p>Unsaved meaningful paragraphs remain after server failure.</p>',
  );
  let failure = 503;
  await page.route('http://127.0.0.1:54321/rest/v1/articles**', (route) => {
    if (route.request().method() !== 'POST' || !failure)
      return route.fallback();
    return route.fulfill({
      status: failure,
      json: {
        code: failure === 409 ? '23505' : 'unavailable',
        message: 'DO-NOT-DISPLAY server detail',
      },
    });
  });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('.editor-error-toast')).toContainText(
    'save could not be confirmed',
  );
  await expect(page.locator('.editor-error-toast')).not.toContainText(
    'DO-NOT-DISPLAY',
  );
  await expect(page.locator('#save-error')).toContainText(
    'save could not be confirmed',
  );
  await page
    .getByRole('button', { name: 'Dismiss error', exact: true })
    .click();
  await expect(page.locator('.editor-error-toast')).toHaveCount(0);
  await expect(page.locator('#save-error')).toContainText(
    'save could not be confirmed',
  );
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'EDITOR REGRESSION TEST ONLY',
  );
  await expect(
    page.getByRole('textbox', { name: 'Article or case content' }),
  ).toContainText('Unsaved meaningful paragraphs');
  failure = 403;
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#save-error')).toContainText(
    'active editorial access',
  );
  await expect(page.locator('.editor-error-toast')).toContainText(
    'active editorial access',
  );
  await expect(
    page.getByRole('textbox', { name: 'Article or case content' }),
  ).toContainText('Unsaved meaningful paragraphs');
  failure = 409;
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#slug-error')).toContainText('already in use');
  await expect(
    page.getByRole('region', { name: 'Errors to resolve' }),
  ).toContainText('already in use');
  await page.getByLabel('Slug', { exact: true }).fill('corrected-after-retry');
  failure = 0;
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved draft to the backend.' }),
  ).toBeVisible();
  expect(records.articles).toHaveLength(1);
  expect(records.articles[0].slug).toBe('corrected-after-retry');
});

test('editor fixes: revoked staff access blocks upload before storage with one error toast (HTTP mocked)', async ({
  page,
}) => {
  await openArticleEditor(page);
  const storage = await imageTransport(page);
  await pasteEditor(page, '<ul><li><p></p></li></ul><p>Keep these edits.</p>');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('.editor-error-toast')).toHaveCount(1);
  await chooseTestCover(page);
  await page.route('http://127.0.0.1:54321/rest/v1/rpc/staff_role', (route) =>
    route.fulfill({ json: null }),
  );
  await page
    .getByRole('button', { name: 'Upload to restricted storage', exact: true })
    .click();
  await expect(page.locator('.editor-error-toast')).toHaveCount(1);
  await expect(page.locator('.editor-error-toast')).toContainText(
    'active editorial access',
  );
  await expect(
    page.locator('.editorial-upload-preview .field-error'),
  ).toContainText('active editorial access');
  expect(storage.count()).toBe(0);
  await expect(
    page.getByRole('textbox', { name: 'Article or case content' }),
  ).toContainText('Keep these edits.');
  await page.unroute('http://127.0.0.1:54321/rest/v1/rpc/staff_role');
  await page.getByRole('button', { name: 'Retry upload', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Uploaded', exact: true }),
  ).toBeVisible();
  expect(storage.count()).toBe(1);
});

for (const width of [320, 768, 1440])
  test(`staff auth polish: inline validation, pending, invalid credentials and retry ${width}px (HTTP mocked)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fakeBackend(page);
    let count = 0,
      deny = true,
      release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      'http://127.0.0.1:54321/auth/v1/token**',
      async (route) => {
        count++;
        if (deny) {
          await held;
          return route.fulfill({
            status: 400,
            json: {
              error_code: 'invalid_credentials',
              msg: 'Invalid login credentials jwt=DO-NOT-DISPLAY',
            },
          });
        }
        return route.fallback();
      },
    );
    await page.goto('/admin/login');
    await expect(
      page.getByRole('heading', { name: 'Staff sign-in', exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute(
      'autocomplete',
      'username',
    );
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('#staff-email-error')).toContainText(
      'assigned to your staff account',
    );
    await expect(page.locator('#staff-password-error')).toContainText(
      'Enter your password',
    );
    expect(count).toBe(0);
    await page
      .getByLabel('Email', { exact: true })
      .fill('staff@example.invalid');
    await page
      .getByLabel('Password', { exact: true })
      .fill('fictional-auth-test-only');
    await page
      .getByRole('button', { name: 'Show password', exact: true })
      .click();
    await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute(
      'type',
      'text',
    );
    await expect(
      page.getByRole('button', { name: 'Hide password', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('button', { name: 'Hide password', exact: true })
      .click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Signing in…', exact: true }),
    ).toBeDisabled();
    await expect(
      page.locator('.staff-auth-submit .editorial-upload-spinner'),
    ).toBeVisible();
    expect(count).toBe(1);
    release();
    await expect(page.locator('#staff-password-error')).toContainText(
      'Email or password is incorrect',
    );
    await expect(page.locator('.editor-error-toast')).not.toContainText(
      'DO-NOT-DISPLAY',
    );
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
      'staff@example.invalid',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    expect(
      await page.evaluate(() =>
        Object.values(localStorage)
          .join(' ')
          .includes('fictional-auth-test-only'),
      ),
    ).toBe(false);
    await page.screenshot({
      path: `.qa/article-editor/sign-in-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'Dismiss error', exact: true })
      .click();
    await expect(page.locator('#staff-password-error')).toBeVisible();
    deny = false;
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      page.getByRole('heading', {
        name: 'Editorial administration',
        exact: true,
      }),
    ).toBeVisible();
    expect(count).toBe(2);
  });
test('staff auth polish: recovery states and exact existing redirect (HTTP mocked; no email)', async ({
  page,
}) => {
  await fakeBackend(page);
  let calls = 0,
    redirect = '';
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    'http://127.0.0.1:54321/auth/v1/recover**',
    async (route) => {
      calls++;
      redirect =
        new URL(route.request().url()).searchParams.get('redirect_to') ?? '';
      await held;
      return route.fulfill({ json: {} });
    },
  );
  await page.goto('/admin/login');
  await page.getByLabel('Email', { exact: true }).fill('staff@example.invalid');
  await page
    .getByRole('button', { name: 'Forgot password?', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Password recovery', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Request recovery email', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Sending…', exact: true }),
  ).toBeDisabled();
  expect(calls).toBe(1);
  release();
  await expect(page.locator('.staff-auth-result')).toContainText(
    'If the account is eligible',
  );
  expect(redirect).toBe('http://127.0.0.1:5182/admin/recovery');
  await page.screenshot({
    path: '.qa/article-editor/password-recovery.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Return to sign-in', exact: true })
    .click();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
    'staff@example.invalid',
  );
  await page.goto('/admin/recovery');
  await expect(
    page.getByRole('button', { name: 'Update password', exact: true }),
  ).toBeDisabled();
  await expect(page.locator('.staff-auth-callout')).toContainText(
    'Access to this page alone cannot change a password',
  );
});
test('author workflow: empty/loading/failure states and deduplicated retry preserve the article (HTTP mocked)', async ({
  page,
}) => {
  const records = await openArticleEditor(page);
  records.authors.length = 0;
  let release = () => {},
    denied = false,
    gets = 0;
  let held: Promise<void> | undefined = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    'http://127.0.0.1:54321/rest/v1/authors**',
    async (route) => {
      gets++;
      if (held) await held;
      if (denied)
        return route.fulfill({
          status: 503,
          json: { message: 'DO-NOT-DISPLAY response' },
        });
      return route.fallback();
    },
  );
  await page
    .getByRole('button', { name: 'Refresh authors', exact: true })
    .click();
  await expect(page.locator('#author-list-state')).toContainText(
    'Loading approved authors',
  );
  await expect(
    page.getByLabel('Approved author', { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText('No approved authors yet.', { exact: false }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(gets).toBe(1);
  release();
  held = undefined;
  await expect(page.locator('#author-list-state')).toContainText(
    'No approved authors yet',
  );
  await page
    .locator('.admin-author-select')
    .screenshot({ path: '.qa/authors/empty-dropdown.png' });
  denied = true;
  await page
    .getByRole('button', { name: 'Refresh authors', exact: true })
    .click();
  await expect(page.locator('#author-id-error')).toContainText(
    'could not be loaded',
  );
  await expect(page.locator('#author-id-error')).not.toContainText(
    'DO-NOT-DISPLAY',
  );
  await expect(page.locator('#author-list-state')).not.toContainText(
    'No approved authors yet',
  );
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'EDITOR REGRESSION TEST ONLY',
  );
  denied = false;
  await page
    .getByRole('button', { name: 'Retry authors', exact: true })
    .click();
  await expect(page.locator('#author-list-state')).toContainText(
    'No approved authors yet',
  );
});

test('author workflow: create, edit, approve in another tab then select without losing edits or cover (HTTP mocked)', async ({
  page,
}) => {
  test.setTimeout(60000);
  const records = await openArticleEditor(page);
  records.authors.length = 0;
  await imageTransport(page);
  await chooseTestCover(page);
  await page
    .getByRole('button', { name: 'Upload to restricted storage', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Uploaded', exact: true }),
  ).toBeVisible();
  await pasteEditor(
    page,
    '<p>Keep this article and its cover while managing authors.</p>',
  );
  await page
    .getByRole('button', { name: 'Refresh authors', exact: true })
    .click();
  await expect(page.locator('#author-list-state')).toContainText(
    'No approved authors yet',
  );
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved draft to the backend.' }),
  ).toBeVisible();
  expect(records.articles[0].author_id).toBeNull();
  const cover = records.articles[0].cover_asset_id;
  await page
    .getByLabel('Title', { exact: true })
    .fill('UNSAVED AUTHOR FLOW TEST ONLY');
  await page
    .getByRole('button', { name: 'Publish approved content', exact: true })
    .click();
  await expect(page.locator('#author-id-error')).toContainText(
    'Choose an approved author',
  );
  const manage = page.getByRole('link', {
    name: 'Manage authors (opens in a new tab)',
    exact: true,
  });
  await expect(manage).toHaveAttribute('target', '_blank');
  const popupPromise = page.waitForEvent('popup');
  await manage.click();
  const authorsPage = await popupPromise;
  await expect(
    authorsPage.getByRole('heading', { name: 'Authors', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(
    authorsPage.getByText('No authors yet.', { exact: false }),
  ).toBeVisible();
  await authorsPage.setViewportSize({ width: 390, height: 844 });
  expect(
    await authorsPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await authorsPage
    .locator('.admin-content')
    .screenshot({ path: '.qa/authors/mobile-management.png' });
  await authorsPage
    .getByLabel('Name', { exact: true })
    .fill('MOCK AUTHOR — INTERCEPTED TEST ONLY');
  await authorsPage
    .getByLabel('Biography', { exact: true })
    .fill('Mocked transport details. Never written to Supabase.');
  await expect(
    authorsPage.getByLabel('Approved author for publication', { exact: true }),
  ).not.toBeChecked();
  await authorsPage
    .getByRole('button', { name: 'Save author', exact: true })
    .click();
  await expect(
    authorsPage
      .getByRole('status')
      .filter({ hasText: 'Author saved without approval.' }),
  ).toBeVisible();
  expect(records.authors).toHaveLength(1);
  expect(records.authors[0].published).toBe(false);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.locator('#author-list-state')).toContainText(
    'No approved authors yet',
  );
  await authorsPage
    .getByLabel('Biography', { exact: true })
    .fill('Edited mocked biography, approved for this isolated HTTP test.');
  await authorsPage
    .getByLabel('Approved author for publication', { exact: true })
    .check();
  await authorsPage
    .getByRole('button', { name: 'Save author', exact: true })
    .click();
  await expect(
    authorsPage
      .getByRole('status')
      .filter({ hasText: 'Author saved and approved.' }),
  ).toBeVisible();
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await expect(
    page.locator('#author-id option', {}).filter({ hasText: 'MOCK AUTHOR' }),
  ).toHaveCount(1);
  await page
    .getByLabel('Approved author', { exact: true })
    .selectOption(String(records.authors[0].id));
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'UNSAVED AUTHOR FLOW TEST ONLY',
  );
  await expect(
    page.getByRole('textbox', { name: 'Article or case content' }),
  ).toContainText('Keep this article and its cover');
  await expect(page.locator('.admin-cover img')).toHaveAttribute(
    'src',
    /token=fixture/,
  );
  expect(records.articles[0].author_id).toBeNull();
  await page
    .getByRole('button', { name: 'Publish approved content', exact: true })
    .click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Saved published to the backend.' }),
  ).toBeVisible();
  expect(records.articles[0].author_id).toBe(records.authors[0].id);
  expect(records.articles[0].cover_asset_id).toBe(cover);
  expect(records.authors[0].description).toContain('Edited mocked biography');
  await authorsPage.close();
});

test('author workflow: backend denial preserves entered details and retries safely (HTTP mocked)', async ({
  page,
}) => {
  const records = await openArticleEditor(page);
  await page.goto('/admin/authors');
  await page.getByLabel('Name', { exact: true }).fill('MOCK DENIAL CHECK ONLY');
  await page
    .getByLabel('Biography', { exact: true })
    .fill('No real author will be created.');
  await page
    .getByLabel('Approved author for publication', { exact: true })
    .check();
  let deny = true;
  await page.route('http://127.0.0.1:54321/rest/v1/authors**', (route) => {
    if (deny && route.request().method() === 'POST')
      return route.fulfill({
        status: 403,
        json: {
          code: '42501',
          message: 'new row violates row-level security secret=DO-NOT-DISPLAY',
        },
      });
    return route.fallback();
  });
  await page.getByRole('button', { name: 'Save author', exact: true }).click();
  await expect(page.locator('.editor-error-toast')).toContainText(
    'Active staff access',
  );
  await expect(page.locator('.admin-form .field-error')).toContainText(
    'Active staff access',
  );
  await expect(page.locator('.editor-error-toast')).not.toContainText(
    'DO-NOT-DISPLAY',
  );
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(
    'MOCK DENIAL CHECK ONLY',
  );
  expect(records.authors).toHaveLength(1);
  deny = false;
  await page.getByRole('button', { name: 'Save author', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Author saved and approved.' }),
  ).toBeVisible();
  expect(records.authors).toHaveLength(2);
});

test('staff auth polish: Full motion settles and Reduced mode is static (HTTP mocked)', async ({
  page,
}) => {
  await fakeBackend(page);
  await page.addInitScript(() =>
    localStorage.setItem('editorial-motion-mode', 'full'),
  );
  await page.goto('/admin/login');
  await expect(page.locator('html')).toHaveAttribute(
    'data-motion-effective',
    'full',
  );
  expect(
    await page
      .locator('.staff-auth-cover-front')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('staff-cover-in');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.staff-auth-cover-front')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await expect(page.getByLabel('Email', { exact: true })).toBeEditable();
});

// Enforced production HTTP policy; all backend traffic is intercepted, not RLS proof.
test.describe('security headers:', () => {
  test.skip(
    ({ baseURL }) => baseURL !== 'http://127.0.0.1:5193',
    'Requires the production-renderer security harness.',
  );
  const backendOrigin = 'https://erwliwgbjlutczmtqoss.supabase.co';
  async function observe(page: Page) {
    await page.addInitScript(() => {
      const state = window as unknown as { policyViolations: string[] };
      state.policyViolations = [];
      document.addEventListener('securitypolicyviolation', (event) =>
        state.policyViolations.push(event.effectiveDirective),
      );
    });
  }
  const violations = (page: Page) =>
    page.evaluate(
      () =>
        (window as unknown as { policyViolations: string[] }).policyViolations,
    );

  test('scripts, fonts, signed covers, Full/Reduced WebGL and carousel remain usable (HTTP mocked)', async ({
    page,
  }) => {
    const records = await fakeBackend(page, 'editor', false, backendOrigin);
    await imageTransport(page, backendOrigin);
    await observe(page);
    for (let index = 1; index <= 2; index++) {
      const id = `66666666-6666-4666-8666-66666666666${index}`;
      const cover = `77777777-7777-4777-8777-77777777777${index}`;
      records.articles.push({
        id,
        slug: `csp-test-only-${index}`,
        status: 'published',
        category_id: records.categories[0].id,
        author_id: records.authors[0].id,
        cover_asset_id: cover,
        featured: true,
        display_order: index,
        updated_at: '2026-10-11T00:00:00Z',
        data: {
          title: `CSP TEST ONLY ${index}`,
          summary: 'Mocked production-browser security check.',
          body: [{ type: 'paragraph', text: 'Intercepted test only.' }],
          readingMinutes: 1,
          publicationLabel: 'TEST ONLY',
          artwork: 'institutions',
          fictional: false,
        },
      });
      records.editorial_assets.push({
        id: cover,
        bucket: 'editorial-images',
        path: `test-only-${index}.png`,
        mime: 'image/png',
        bytes: testPNG.length,
        label: 'MOCK SIGNED COVER ONLY',
      });
    }
    records.homepage_settings.push({
      id: true,
      data: {
        ...defaultSiteSettings,
        featuredArticleIds: records.articles.map((r) => r.id),
        featuredCaseIds: [],
      },
      updated_at: '2026-10-11T00:00:00Z',
    });
    await page.goto('/admin/login');
    await expect(
      page.getByRole('heading', { name: 'Staff sign-in' }),
    ).toBeVisible();
    await page
      .getByRole('link', { name: 'Indo-US Law Forum — Home', exact: true })
      .click();
    await expect(page.locator('.publication-caption')).toContainText(
      'CSP TEST ONLY',
    );
    await expect(page.locator('.static-volume img').first()).toHaveJSProperty(
      'naturalWidth',
      1,
    );
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () =>
          document.fonts.check('700 24px "Source Serif"') &&
          document.fonts.check('400 16px "Public Sans"'),
      ),
    ).toBe(true);
    await chooseExperience(page, 'full');
    await page.locator('.sculpture-art').scrollIntoViewIfNeeded();
    await expect(page.locator('.sculpture-stage')).toHaveAttribute(
      'data-webgl',
      'ready',
      { timeout: 15000 },
    );
    await expect(page.locator('.sculpture-stage canvas')).toHaveCount(1);
    await page
      .getByRole('button', {
        name: 'Select CSP TEST ONLY 2 cover',
        exact: true,
      })
      .click();
    await expect(page.locator('.publication-caption')).toContainText(
      'CSP TEST ONLY 2',
    );
    await expect(page.locator('.research-carousel')).toBeVisible();
    await chooseExperience(page, 'reduced');
    await expect(page.locator('.sculpture-stage')).toHaveAttribute(
      'data-webgl',
      'ready',
    );
    expect(await violations(page)).toEqual([]);
  });

  test('real app login errors/retry, Tiptap, blob preview, upload/save and recovery UI work (HTTP mocked)', async ({
    page,
  }) => {
    const records = await fakeBackend(page, 'editor', false, backendOrigin);
    const storage = await imageTransport(page, backendOrigin);
    await observe(page);
    let deny = true;
    await page.route(`${backendOrigin}/auth/v1/token**`, (route) =>
      deny
        ? route.fulfill({
            status: 400,
            json: {
              code: 'invalid_credentials',
              message: 'Invalid login credentials',
            },
          })
        : route.fallback(),
    );
    await page.goto('/admin/login');
    await page
      .getByLabel('Email', { exact: true })
      .fill('staff@example.invalid');
    await page
      .getByRole('button', { name: 'Forgot password?', exact: true })
      .click();
    // Recovery UI only: never click the send button in this policy check.
    await expect(
      page.getByRole('heading', { name: 'Password recovery', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Return to sign-in', exact: true })
      .click();
    await page
      .getByLabel('Password', { exact: true })
      .fill('fictional-transport-test-only');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.locator('.editor-error-toast')).toContainText(
      /password|credentials/i,
    );
    await expect(page.getByLabel('Email', { exact: true })).toHaveValue(
      'staff@example.invalid',
    );
    deny = false;
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Admin', exact: true })
      .getByRole('link', { name: 'Articles', exact: true })
      .click();
    await page.getByRole('link', { name: /Create/ }).click();
    await page.getByLabel('Title', { exact: true }).fill('CSP DRAFT TEST ONLY');
    await page.getByLabel('Slug', { exact: true }).fill('csp-draft-test-only');
    await page
      .getByLabel('Excerpt', { exact: true })
      .fill('Mocked save under enforced CSP.');
    await page
      .getByLabel('Publication label', { exact: true })
      .fill('TEST ONLY');
    await page
      .getByRole('textbox', { name: 'Article or case content' })
      .fill('This unsaved text must survive upload.');
    const nonce = await page
      .locator('script[type="module"][nonce]')
      .evaluate((el) => (el as HTMLScriptElement).nonce);
    expect(
      await page
        .locator('style[data-tiptap-style]')
        .evaluate((el) => (el as HTMLStyleElement).nonce),
    ).toBe(nonce);
    await chooseTestCover(page);
    await expect(
      page.getByAltText('Selected image preview', { exact: true }),
    ).toHaveAttribute('src', /^blob:/);
    await expect(
      page.getByAltText('Selected image preview', { exact: true }),
    ).toHaveJSProperty('naturalWidth', 1);
    storage.hold();
    await page
      .getByRole('button', {
        name: 'Upload to restricted storage',
        exact: true,
      })
      .click();
    await expect(
      page.getByRole('button', { name: 'Uploading…', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Save draft', exact: true }),
    ).toBeDisabled();
    storage.release();
    await expect(
      page.getByRole('button', { name: 'Uploaded', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Saved draft to the backend.' }),
    ).toBeVisible();
    expect(records.articles).toHaveLength(1);
    expect(records.articles[0].cover_asset_id).toBe(
      records.editorial_assets[0].id,
    );
    expect(await violations(page)).toEqual([]);
  });

  test('blocks injected scripts/styles and unrelated connections/images (HTTP mocked)', async ({
    page,
  }) => {
    await fakeBackend(page, 'editor', false, backendOrigin);
    await observe(page);
    let foreignRequests = 0;
    await page.route('https://blocked.example.invalid/**', (route) => {
      foreignRequests++;
      return route.abort();
    });
    await page.goto('/admin/login');
    await expect(
      page.getByRole('heading', { name: 'Staff sign-in' }),
    ).toBeVisible();
    expect(await violations(page)).toEqual([]);
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent =
        'document.documentElement.dataset.injectedScript = "ran"';
      document.body.append(script);
      const external = document.createElement('script');
      external.src = 'https://blocked.example.invalid/code.js';
      document.body.append(external);
      const style = document.createElement('style');
      style.textContent = 'body { --injected-style: ran; }';
      document.head.append(style);
      const image = document.createElement('img');
      image.src = 'https://blocked.example.invalid/image.png';
      document.body.append(image);
      void fetch('https://blocked.example.invalid/data').catch(() => {});
    });
    await expect
      .poll(() => violations(page))
      .toEqual(
        expect.arrayContaining([
          'script-src-elem',
          'style-src-elem',
          'img-src',
          'connect-src',
        ]),
      );
    expect(
      await page.locator('html').getAttribute('data-injected-script'),
    ).toBeNull();
    expect(
      await page
        .locator('body')
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--injected-style').trim(),
        ),
    ).toBe('');
    expect(foreignRequests).toBe(0);
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  });
});
