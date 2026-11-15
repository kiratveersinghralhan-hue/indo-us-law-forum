import { test, expect } from '@playwright/test';
import { researchCategories } from '../../src/config/research-categories';

for (const width of [390, 768, 1440]) {
  test.describe(`confirmed identity and taxonomy ${width}px`, () => {
    test.use({
      viewport: { width, height: 900 },
      hasTouch: width < 1025,
      isMobile: width < 769,
    });
    test('all four areas navigate/filter; uploads stay disabled and samples remain explicit', async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        localStorage.setItem('editorial-motion-mode', 'reduced');
        sessionStorage.setItem('editorial-intro-seen', '1');
      });
      await page.goto('/');
      await expect(page.locator('.brand')).toContainText('Indo-US Law Forum');
      await expect(page.locator('.focus-row')).toHaveCount(4);
      await expect(page.locator('.hero-actions a')).toHaveText([
        'Read articles→',
        'Submit an article→',
      ]);
      await expect(page.locator('body')).toHaveCSS('color', 'rgb(0, 0, 0)');
      for (const c of researchCategories) {
        await page
          .locator('.focus-row')
          .filter({
            has: page.getByRole('heading', { name: c.label, exact: true }),
          })
          .click();
        await expect(page).toHaveURL(new RegExp(`category=${c.id}`));
        await expect(page.getByLabel('Filter by category')).toHaveValue(c.id);
        await expect(page.locator('.article-card')).toHaveCount(1);
        await expect(page.locator('.article-card')).toContainText(c.label);
        await expect(page.locator('.article-card > p:not(.eyebrow)')).toHaveCSS(
          'color',
          'rgb(0, 0, 0)',
        );
        await page.locator('.article-card h2 a').click();
        await expect(page.locator('.sample-notice')).toContainText(
          'Fictional article',
        );
        await expect(page).toHaveTitle(/Indo-US Law Forum/);
        await expect(
          page.locator('meta[property="og:description"]'),
        ).toHaveAttribute('content', /No legal findings/);
        await page.goto('/');
      }
      await page.goto('/admin/articles/new');
      for (const c of researchCategories)
        await expect(
          page.locator('#categoryId option').filter({ hasText: c.label }),
        ).toHaveCount(1);
      await expect(
        page.locator('#categoryId option[value="institutions"]'),
      ).toContainText('mapping pending');
      await expect(page.locator('.admin-header')).toContainText(
        'Indo-US Law Forum',
      );
      await page.goto('/submit');
      if (width === 1440)
        await expect(page.locator('.primary-nav .nav-submit')).toHaveCSS(
          'color',
          'rgb(255, 255, 255)',
        );
      await expect(
        page.locator('.submission-aside > p:not(.eyebrow)').first(),
      ).toHaveCSS('color', 'rgb(255, 255, 255)');
      await expect(page.locator('.submission-steps')).toHaveCSS(
        'color',
        'rgb(255, 255, 255)',
      );
      await expect(
        page.getByLabel('PDF version', { exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByLabel('Word version', { exact: true }),
      ).toBeDisabled();
      await expect(page.locator('#document-policy')).toContainText(
        'await confirmation',
      );
      await expect(page.locator('html')).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      expect(errors).toEqual([]);
    });
  });
}
