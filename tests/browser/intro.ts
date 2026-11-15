import { chooseExperience } from './experience-controls';
import { test, expect } from '@playwright/test';

test('readable but unwritable session storage still prevents duplicate intros within the app', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('editorial-motion-mode', 'full');
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'editorial-intro-seen')
        throw new DOMException('Full', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.goto('/');
  await expect(page.locator('.editorial-intro')).toBeVisible();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await chooseExperience(page, 'reduced');
  await chooseExperience(page, 'full');
  await expect(page.locator('.editorial-intro')).toHaveCount(0);
  await page.getByRole('link', { name: 'Read articles', exact: true }).click();
  await page
    .getByRole('link', {
      name: 'The Corridor — Home',
      exact: true,
    })
    .click();
  await expect(page.locator('.editorial-intro')).toHaveCount(0);
});

for (const width of [390, 1440]) {
  test.describe(`intro ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    test('welcome exits before Full intro, skip restores focus, and the session never repeats it', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.locator('.editorial-intro')).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Experience full motion' })
        .click();
      await expect(page.getByRole('dialog')).toHaveAttribute(
        'data-phase',
        'exiting',
      );
      await expect(page.locator('.editorial-intro')).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('.editorial-intro')).toBeVisible();
      await expect(page.locator('#main-content')).toBeFocused();
      await page.getByRole('button', { name: 'Skip intro' }).press('Enter');
      await expect(page.locator('.editorial-intro')).toHaveCount(0);
      await expect(page.locator('#main-content')).toBeFocused();
      await page.mouse.wheel(0, 300);
      await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(100);
      await page.reload();
      await expect(page.locator('.editorial-intro, dialog')).toHaveCount(0);
      await page
        .getByRole('link', { name: 'Read articles', exact: true })
        .click();
      await page
        .getByRole('link', {
          name: 'The Corridor — Home',
          exact: true,
        })
        .click();
      await expect(page.locator('.editorial-intro')).toHaveCount(0);
    });
    test('Calm and Escape skip intro and leave scrolling/navigation available', async ({
      page,
    }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Plain website' }).click();
      await expect(page.locator('.editorial-intro, dialog')).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      await page.mouse.wheel(0, 250);
      await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(100);
      await page.reload();
      await expect(page.locator('.editorial-intro, dialog')).toHaveCount(0);
    });
  });
}
test('returning Full intro finishes around 2.05s, independent of failed WebGL, and route changes remove it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('editorial-motion-mode', 'full');
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      return String(args[0]).includes('webgl')
        ? null
        : original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('.editorial-intro')).toBeVisible();
  await expect(page.locator('#hero-heading')).toBeVisible();
  await expect(page.locator('.editorial-intro')).toHaveCount(0, {
    timeout: 2800,
  });
  await expect(page.locator('.sculpture-stage')).toHaveAttribute(
    'data-webgl-status',
    'unavailable',
  );
  await page.evaluate(() => sessionStorage.removeItem('editorial-intro-seen'));
  await page.reload();
  await page.keyboard.press('Escape');
  await expect(page.locator('.editorial-intro')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem('editorial-intro-seen'));
  await page.reload();
  await page.getByRole('link', { name: 'Read articles', exact: true }).click();
  await expect(page).toHaveURL(/\/articles$/);
  await expect(page.locator('.editorial-intro')).toHaveCount(0);
});
