import { test, expect, type Page } from '@playwright/test';

const cover =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const group = (page: Page) =>
  page.getByRole('group', { name: 'Featured articles', exact: true });
async function saveSettings(page: Page) {
  await page.getByRole('checkbox', { name: /I confirm these edits/ }).check();
  await page
    .getByRole('button', { name: 'Save demo settings', exact: true })
    .click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Homepage/content settings saved' }),
  ).toBeVisible();
}
for (const mode of ['full', 'reduced']) {
  test.describe(`managed feature ${mode}`, () => {
    test.use({ viewport: { width: 1440, height: 1000 } });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((mode) => {
        localStorage.setItem('editorial-motion-mode', mode);
        sessionStorage.setItem('editorial-intro-seen', '1');
      }, mode);
    });
    test('admin order/refetch keeps stable selection, saved cover correspondence and exact article navigation', async ({
      page,
      context,
    }) => {
      await page.goto('/admin/settings');
      await expect(group(page)).toBeVisible();
      const publicPage = await context.newPage();
      await publicPage.goto('/');
      await publicPage
        .getByRole('button', {
          name: 'Select Mapping neighbourhood shade cover',
        })
        .click();
      const stage = publicPage.locator('.sculpture-stage');
      const selectedId = await stage.getAttribute('data-selected-article');
      await page
        .getByRole('button', {
          name: 'Move featured articles 3 up',
          exact: true,
        })
        .click();
      await saveSettings(page);
      await expect(stage).toHaveAttribute('data-selected-article', selectedId!);
      await expect(stage).toHaveAttribute('data-selected-cover', '1');
      await expect(
        publicPage.locator('.publication-caption a'),
      ).toHaveAttribute('href', '/articles/mapping-neighbourhood-shade');
      await page.goto(`/admin/articles/${selectedId}`);
      await page
        .getByLabel('Local article cover', { exact: true })
        .setInputFiles({
          name: 'fictional.png',
          mimeType: 'image/png',
          buffer: Buffer.from(cover, 'base64'),
        });
      await page
        .getByLabel('Cover description', { exact: true })
        .fill('Fictional cover replacement');
      await page
        .getByRole('checkbox', { name: /I confirm these edits/ })
        .check();
      await page
        .getByRole('button', { name: 'Save published demo', exact: true })
        .click();
      await expect(page.getByRole('status')).toContainText('Saved published');
      await expect(
        publicPage.locator('.static-volume.is-selected img'),
      ).toHaveAttribute('src', /^data:image\/png;base64/);
      await expect(stage).toHaveAttribute('data-selected-article', selectedId!);
      await expect(publicPage.locator('.publication-caption')).toContainText(
        'A sample research outline',
      );
      await publicPage
        .getByRole('link', { name: 'Read article', exact: true })
        .click();
      await expect(publicPage.locator('h1')).toHaveText(
        'Mapping neighbourhood shade',
      );
      await expect(
        publicPage.getByAltText('Fictional cover replacement'),
      ).toHaveAttribute('src', /^data:image\/png;base64/);
      await publicPage.close();
    });
    test('zero/one/multiple, removal without deletion and unpublish/delete prune the public selection', async ({
      page,
      context,
    }) => {
      await page.goto('/admin/settings');
      await expect(group(page)).toBeVisible();
      expect(
        await group(page)
          .getByRole('checkbox', { name: /Sample draft awaiting review/ })
          .count(),
      ).toBe(0);
      for (const checkbox of await group(page).getByRole('checkbox').all())
        await checkbox.uncheck();
      await saveSettings(page);
      const publicPage = await context.newPage();
      await publicPage.goto('/');
      await expect(publicPage.locator('.publication-caption')).toContainText(
        'next edition is in preparation',
      );
      await expect(publicPage.locator('.static-volume')).toHaveCount(1);
      await expect(
        publicPage.locator('.publication-selectors button, .orbit-cover'),
      ).toHaveCount(0);
      await expect(publicPage.locator('.publication-caption a')).toHaveCount(0);
      await group(page)
        .getByRole('checkbox', { name: /Reading the spaces/ })
        .check();
      await saveSettings(page);
      await expect(
        publicPage.locator('.publication-selectors button'),
      ).toHaveCount(1);
      await expect(publicPage.locator('.static-volume')).toHaveCount(1);
      if (mode === 'full')
        await publicPage
          .getByRole('button', { name: 'Next research slide' })
          .click();
      else
        await expect(
          publicPage.getByRole('button', { name: 'Next research slide' }),
        ).toBeDisabled();
      await expect(publicPage.locator('.carousel-count')).toContainText('01');
      for (const title of [
        'A library as a shared space',
        'Mapping neighbourhood shade',
        'The language of public records',
      ])
        await group(page)
          .getByRole('checkbox', { name: new RegExp(title) })
          .check();
      await saveSettings(page);
      await expect(
        publicPage.locator('.publication-selectors button'),
      ).toHaveCount(3);
      await expect(publicPage.locator('.carousel-dots button')).toHaveCount(4);
      const id = await publicPage
        .locator('.sculpture-stage')
        .getAttribute('data-selected-article');
      await page.goto(`/admin/articles/${id}`);
      await page
        .getByRole('checkbox', { name: /I confirm these edits/ })
        .check();
      await page
        .getByRole('button', { name: 'Unpublish to draft', exact: true })
        .click();
      await expect(
        publicPage.locator('.publication-caption'),
      ).not.toContainText('Reading the spaces between public decisions');
      await page.goto('/admin/articles');
      await expect(
        page.getByRole('heading', {
          name: 'Reading the spaces between public decisions',
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole('button', {
          name: 'Delete A library as a shared space',
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: 'Delete demo record', exact: true })
        .click();
      await expect(
        publicPage.locator('.publication-selectors button'),
      ).toHaveCount(2);
      await expect(
        publicPage.locator('.publication-selectors'),
      ).not.toContainText('A library as a shared space');
      await publicPage.close();
    });
  });
}
