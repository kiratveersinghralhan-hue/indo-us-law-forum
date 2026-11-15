import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('editorial-motion-mode') === null)
      localStorage.setItem('editorial-motion-mode', 'reduced');
  });
});
const adminNav = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Admin', exact: true })
    .getByRole('link', { name, exact: true });
async function attest(page: Page) {
  await page.getByRole('checkbox', { name: /I confirm these edits/ }).check();
}
async function createContent(
  page: Page,
  kind: 'articles' | 'cases',
  title: string,
  slug: string,
) {
  await page.goto(`/admin/${kind}/new`);
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Slug', { exact: true }).fill(slug);
  await page
    .getByLabel('Excerpt', { exact: true })
    .fill('A fictional local workflow test excerpt.');
  await page
    .getByLabel('Block 1 text', { exact: true })
    .fill('A fictional local workflow test paragraph.');
}
async function saved(page: Page, status: string) {
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: `Saved ${status} to local demo only.` }),
  ).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test('article create/draft/publish/edit/unpublish/delete and public reflection', async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET') requests.push(r.method());
  });
  await createContent(
    page,
    'articles',
    'Sample workflow article',
    'sample-workflow-article',
  );
  await attest(page);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await saved(page, 'draft');
  const publicPage = await context.newPage();
  await publicPage.goto('/articles/sample-workflow-article');
  await expect(
    publicPage.getByRole('heading', { name: 'Article not found', exact: true }),
  ).toBeVisible();
  await attest(page);
  await page
    .getByRole('button', { name: 'Publish to local demo', exact: true })
    .click();
  await saved(page, 'published');
  // storage event updates an already-open public tab, including not-found -> detail.
  await expect(
    publicPage.getByRole('heading', {
      name: 'Sample workflow article',
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel('Title', { exact: true })
    .fill('Sample workflow revised');
  await attest(page);
  await page
    .getByRole('button', { name: 'Save published demo', exact: true })
    .click();
  await saved(page, 'published');
  await expect(publicPage.locator('h1')).toHaveText('Sample workflow revised');
  await page
    .getByLabel('Title', { exact: true })
    .fill('Sample workflow article');
  await attest(page);
  await page
    .getByRole('button', { name: 'Save published demo', exact: true })
    .click();
  await saved(page, 'published');
  await attest(page);
  await page
    .getByRole('button', { name: 'Unpublish to draft', exact: true })
    .click();
  await saved(page, 'draft');
  await expect(publicPage.locator('h1')).toHaveText('Article not found');
  await adminNav(page, 'Articles').click();
  await page.getByLabel('Search articles').fill('Sample workflow');
  await page.getByLabel('Publication status').selectOption('draft');
  await expect(page.locator('.admin-records > li')).toHaveCount(1);
  await page
    .getByRole('button', {
      name: 'Delete Sample workflow article',
      exact: true,
    })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', {
      name: 'Delete Sample workflow article',
      exact: true,
    }),
  ).toBeFocused();
  await page
    .getByRole('button', {
      name: 'Delete Sample workflow article',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Delete demo record', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'No demo records match.', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Articles', exact: true }),
  ).toBeFocused();
  expect(requests).toEqual([]);
  await publicPage.close();
});

test('required validation, unsafe duplicate slug, structured preview and local image only', async ({
  page,
}) => {
  await page.goto('/admin/articles/new');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toBeFocused();
  await page.getByLabel('Title', { exact: true }).fill('Sample validation');
  await page.getByLabel('Slug', { exact: true }).fill('Bad slug');
  await page
    .getByLabel('Excerpt', { exact: true })
    .fill('Sample validation excerpt');
  await page
    .getByLabel('Block 1 text', { exact: true })
    .fill('<script>alert("fictional")</script>');
  await page
    .getByRole('button', { name: 'Preview structured content', exact: true })
    .click();
  await expect(page.locator('.admin-preview .reading-content p')).toHaveText(
    '<script>alert("fictional")</script>',
  );
  expect(await page.locator('.admin-preview script').count()).toBe(0);
  await attest(page);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('lowercase slug');
  await expect(page.getByLabel('Slug', { exact: true })).toBeFocused();
  const image = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
    'base64',
  );
  await page
    .getByLabel('Local article cover')
    .setInputFiles({
      name: 'fictional.png',
      mimeType: 'image/png',
      buffer: image,
    });
  await expect(page.locator('.admin-cover img')).toBeVisible();
  await page.getByLabel('Slug', { exact: true }).fill('sample-validation');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await saved(page, 'draft');
  const savedStore = await page.evaluate(() =>
    localStorage.getItem('dilraj-editorial:local-admin-demo:v1'),
  );
  expect(savedStore).not.toContain('blob:');
  expect(savedStore).not.toContain('fictional.png');
  await page
    .getByRole('button', { name: 'Remove uploaded cover', exact: true })
    .click();
  await expect(page.locator('.admin-cover img')).not.toHaveAttribute(
    'src',
    /^data:/,
  );
  const duplicate = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('dilraj-editorial:local-admin-demo:v1')!)
        .articles[0].slug as string,
  );
  await page.getByLabel('Slug', { exact: true }).fill(duplicate);
  await attest(page);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('already used');
});

test('submission review and conversion is duplicate-safe and never automatic publication', async ({
  page,
}) => {
  await page.goto('/admin/submissions');
  const sample = page
    .locator('.admin-panel')
    .filter({ hasText: 'A sample reading-room question' });
  await expect(
    sample.getByRole('button', { name: 'Convert to draft', exact: true }),
  ).toBeDisabled();
  await sample.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect(sample).toContainText('approved');
  await sample
    .getByRole('button', { name: 'Convert to draft', exact: true })
    .click();
  await expect(sample).toContainText('Already converted once');
  await expect(
    sample.getByRole('button', { name: 'Convert to draft', exact: true }),
  ).toBeDisabled();
  await page
    .locator('.admin-panel')
    .filter({ hasText: 'Sources and context — sample note' })
    .getByRole('button', { name: 'Reject', exact: true })
    .click();
  await page.reload();
  await expect(
    page
      .locator('.admin-panel')
      .filter({ hasText: 'Sources and context — sample note' }),
  ).toContainText('rejected');
  await sample.getByRole('link', { name: 'Open converted article' }).click();
  await expect(page.locator('.admin-heading')).toContainText(
    'Current saved state: draft',
  );
  const publicSlug = await page
    .getByLabel('Slug', { exact: true })
    .inputValue();
  await page.goto(`/articles/${publicSlug}`);
  await expect(page.locator('h1')).toHaveText('Article not found');
  await page.goto('/admin');
  await expect(
    page.locator('.admin-stats').getByText('Published articles').locator('..'),
  ).toContainText('9');
  await expect(
    page.getByText('Analytics not connected', { exact: true }),
  ).toBeVisible();
});

test('case metadata editing, draft/publication, supporting-document placeholders and delete', async ({
  page,
  context,
}) => {
  await createContent(
    page,
    'cases',
    'Sample workflow case',
    'sample-workflow-case',
  );
  await page.getByLabel('Tags (comma separated)').fill('demo');
  await page
    .getByLabel('Tags (comma separated)')
    .pressSequentially(', fictional tag');
  await page
    .getByLabel('Supporting-document placeholders — not uploaded')
    .fill('Sample supporting note');
  await page
    .getByLabel('Supporting-document placeholders — not uploaded')
    .press('End');
  await page
    .getByLabel('Supporting-document placeholders — not uploaded')
    .press('Enter');
  await page
    .getByLabel('Supporting-document placeholders — not uploaded')
    .pressSequentially('Sample appendix');
  await attest(page);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await saved(page, 'draft');
  await attest(page);
  await page
    .getByRole('button', { name: 'Publish to local demo', exact: true })
    .click();
  await saved(page, 'published');
  const publicPage = await context.newPage();
  await publicPage.goto('/cases/sample-workflow-case');
  await expect(publicPage.locator('h1')).toHaveText('Sample workflow case');
  await expect(
    publicPage.getByText('Sample supporting note — not uploaded', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(publicPage.locator('.case-tags')).toContainText('fictional');
  await expect(
    publicPage.getByText('Sample appendix — not uploaded', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Provisional setting').fill('Sample revised setting');
  await attest(page);
  await page.getByRole('button', { name: 'Save published demo' }).click();
  await saved(page, 'published');
  await expect(publicPage.locator('.case-metadata')).toContainText(
    'Sample revised setting',
  );
  await attest(page);
  await page.getByRole('button', { name: 'Unpublish to draft' }).click();
  await saved(page, 'draft');
  await expect(publicPage.locator('h1')).toHaveText('Case not found');
  await adminNav(page, 'Cases').click();
  await page
    .getByRole('button', { name: 'Delete Sample workflow case', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Delete demo record', exact: true })
    .click();
  await expect(page.locator('.admin-records')).not.toContainText(
    'Sample workflow case',
  );
  await publicPage.close();
});

test('sample team add/edit/reorder/links/remove and public reflection', async ({
  page,
  context,
}) => {
  await page.goto('/admin/team/new');
  await page.getByLabel('Sample name').fill('Sample member Z');
  await page.getByLabel('Sample role').fill('Sample role Z');
  await page
    .getByLabel('Sample biography')
    .fill('Fictional biography for local workflow testing.');
  await page
    .getByRole('button', { name: 'Add sample link', exact: true })
    .click();
  await attest(page);
  await page
    .getByRole('button', { name: 'Save sample member', exact: true })
    .click();
  await saved(page, 'sample member');
  await page.getByLabel('Sample role').fill('Sample revised role');
  await attest(page);
  await page
    .getByRole('button', { name: 'Save sample member', exact: true })
    .click();
  await saved(page, 'sample member');
  await adminNav(page, 'Team').click();
  for (let i = 0; i < 3; i++)
    await page
      .getByRole('button', { name: 'Move Sample member Z up', exact: true })
      .click();
  await expect(page.locator('.admin-records > li').first()).toContainText(
    'Sample member Z',
  );
  const publicPage = await context.newPage();
  await publicPage.goto('/team');
  await expect(publicPage.locator('.team-card').first()).toContainText(
    'Sample member Z',
  );
  await expect(publicPage.locator('.team-card').first()).toContainText(
    'Sample revised role',
  );
  await expect(
    publicPage.getByRole('link', { name: 'Sample link', exact: true }),
  ).toHaveAttribute('href', 'https://example.org');
  await page
    .getByRole('button', { name: 'Delete Sample member Z', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Delete demo record', exact: true })
    .click();
  await expect(publicPage.locator('.team-card')).toHaveCount(3);
  await publicPage.close();
});

test('homepage settings/order/featured selection reflects publicly and confirmed reset restores samples', async ({
  page,
  context,
}) => {
  await page.goto('/admin/settings');
  await page.getByLabel('Headline line 1').fill('Sample reading renewed');
  await page
    .getByLabel('Focus 1 description')
    .fill('Sample description updated');
  await page.getByLabel('Sample contact email').fill('research@example.org');
  await page
    .getByLabel('Sample contact details')
    .fill('Fictional address — not client details.');
  await page
    .getByRole('button', { name: 'Add sample link', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: 'Move Featured research section up',
      exact: true,
    })
    .click();
  await page
    .getByRole('checkbox', { name: 'Show Team preview', exact: true })
    .uncheck();
  await page
    .getByRole('button', { name: 'Move featured articles 2 up', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Move featured cases 2 up', exact: true })
    .click();
  const featured = page.getByRole('group', {
    name: 'Featured articles',
    exact: true,
  });
  const selectedTitles = await featured
    .locator('.admin-feature-preview h3')
    .allTextContents();
  await attest(page);
  await page
    .getByRole('button', { name: 'Save demo settings', exact: true })
    .click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Homepage/content settings saved' }),
  ).toBeVisible();
  const publicPage = await context.newPage();
  await publicPage.goto('/');
  await expect(publicPage.locator('#hero-heading')).toContainText(
    'Sample reading renewed',
  );
  await expect(publicPage.locator('.focus-row').first()).toContainText(
    'Sample description updated',
  );
  await expect(publicPage.locator('.team-preview')).toHaveCount(0);
  await expect(publicPage.locator('.carousel-slide').first()).toContainText(
    selectedTitles[0],
  );
  const positions = await publicPage
    .locator('.featured-band, .focus-section')
    .evaluateAll((nodes) => nodes.map((n) => n.className));
  expect(positions[0]).toBe('featured-band');
  await expect(
    publicPage.getByRole('link', { name: 'research@example.org' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Reset demo data', exact: true })
    .click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Headline line 1')).toHaveValue(
    'Sample reading renewed',
  );
  await page
    .getByRole('button', { name: 'Reset demo data', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reset all demo records', exact: true })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Demo data reset' }),
  ).toBeVisible();
  await expect(page.getByLabel('Headline line 1')).not.toHaveValue(
    'Sample reading renewed',
  );
  await expect(publicPage.locator('.team-preview')).toBeVisible();
  await expect(publicPage.locator('#hero-heading')).not.toContainText(
    'Sample reading renewed',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-motion-effective',
    'reduced',
  );
  await publicPage.close();
});

test('unsaved navigation and browser back are blocked until cancelled/discarded, with keyboard focus', async ({
  page,
}) => {
  await page.goto('/admin/articles');
  await page.getByRole('link', { name: 'Create article', exact: true }).click();
  await page
    .getByLabel('Title', { exact: true })
    .fill('Unsaved fictional title');
  await adminNav(page, 'Cases').click();
  await expect(
    page.getByRole('dialog', { name: 'Discard unsaved changes?' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Unsaved fictional title',
  );
  await page.goBack();
  await expect(
    page.getByRole('dialog', { name: 'Discard unsaved changes?' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Discard changes', exact: true })
    .press('Enter');
  await expect(page).toHaveURL(/\/admin\/articles$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('invalid/blocked store has an honest error, retry and confirmed recovery; saves fail visibly', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'dilraj-editorial:local-admin-demo:v1',
      '{"version":99}',
    ),
  );
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Local demo data could not be loaded.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry local data' }).click();
  await expect(
    page.getByRole('heading', { name: 'Local demo data could not be loaded.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Reset demo data', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reset all demo records', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Admin', exact: true })
    .getByRole('link', { name: 'Articles', exact: true })
    .click();
  await page
    .locator('.admin-records > li')
    .first()
    .getByRole('link', { name: 'Edit', exact: true })
    .click();
  await page
    .getByLabel('Title', { exact: true })
    .fill('A fictional failed save');
  await attest(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'dilraj-editorial:local-admin-demo:v1')
        throw new DOMException('Quota', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page
    .getByRole('button', { name: 'Save published demo', exact: true })
    .click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Local save failed' }),
  ).toBeVisible();
  await expect(page.locator('.admin-heading')).toContainText(
    'Unsaved fictional edits',
  );
});

test('dirty reload warns and can be cancelled; successful save clears the unload warning', async ({
  page,
}) => {
  await createContent(
    page,
    'articles',
    'Sample reload warning',
    'sample-reload-warning',
  );
  let warnings = 0;
  page.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('beforeunload');
    warnings++;
    await dialog.dismiss();
  });
  await page
    .reload({ timeout: 1500 })
    .catch((error) => expect(String(error)).toMatch(/Timeout|ERR_ABORTED/));
  expect(warnings).toBe(1);
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(
    'Sample reload warning',
  );
  await attest(page);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await saved(page, 'draft');
  warnings = 0;
  await page.reload();
  expect(warnings).toBe(0);
  await expect(
    page.getByRole('heading', { name: 'Create article', exact: true }),
  ).toBeVisible();
});

test('blocked namespace access keeps chrome available and exposes honest record/reset errors', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'dilraj-editorial:local-admin-demo:v1')
        throw new DOMException('Blocked', 'SecurityError');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'dilraj-editorial:local-admin-demo:v1')
        throw new DOMException('Blocked', 'SecurityError');
      return set.call(this, key, value);
    };
  });
  await page.goto('/');
  await expect(page.locator('#hero-heading')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Content could not be loaded.' }),
  ).toBeVisible();
  await expect(page.locator('.focus-row,.carousel-slide')).toHaveCount(0);
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Local demo data could not be loaded.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Reset demo data', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Reset all demo records', exact: true })
    .click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Local save failed' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toHaveCount(0);
});

for (const width of [320, 390, 768])
  test(`mobile/tablet admin keyboard and responsive usability ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { name: 'Dashboard', exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await page.screenshot({
      path: `.qa/admin/dashboard-${width}.png`,
      fullPage: true,
    });
    await adminNav(page, 'Team').getAttribute('href');
    await adminNav(page, 'Team').press('Enter');
    await expect(
      page.getByRole('link', { name: 'Create sample member', exact: true }),
    ).toBeVisible();
    await noOverflow(page);
    await page
      .getByRole('link', { name: 'Create sample member', exact: true })
      .press('Enter');
    await page.getByLabel('Sample name').fill('Sample mobile member');
    await page.getByLabel('Sample role').fill('Sample mobile role');
    await page
      .getByLabel('Sample biography')
      .fill('Fictional mobile demo biography.');
    await attest(page);
    await page
      .getByRole('button', { name: 'Save sample member', exact: true })
      .press('Enter');
    await saved(page, 'sample member');
    await noOverflow(page);
    await page.setViewportSize({ width: 900, height: width });
    await noOverflow(page);
  });
