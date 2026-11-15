/* global document, scrollTo, innerWidth */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const directory = '.qa/managed-hero';
const origin = 'http://127.0.0.1:5173';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [device, width, height] of [
    ['desktop', 1440, 1000],
    ['tablet', 768, 1024],
    ['mobile', 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: width < 1025,
      isMobile: width < 769,
    });
    await context.addInitScript(() => {
      localStorage.setItem('editorial-motion-mode', 'reduced');
      sessionStorage.setItem('editorial-intro-seen', '1');
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of [
      '/',
      '/articles',
      '/cases',
      '/team',
      '/submit',
      '/admin',
      '/admin/articles',
      '/admin/settings',
    ]) {
      await page.goto(`${origin}${route}`);
      await page.locator('h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (route === '/')
        await expect(page.locator('.sculpture-stage')).toHaveAttribute(
          'data-webgl',
          'ready',
        );
      if (route.startsWith('/admin'))
        await page.locator('.admin-content').waitFor();
      for (const art of await page.locator('.editorial-art').all())
        await art.scrollIntoViewIfNeeded();
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForTimeout(250);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, `${route} at ${width}px`);
      assert.deepEqual(errors, []);
      const name = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
      await page.screenshot({
        path: `${directory}/${name}-${device}-plain.png`,
        fullPage: true,
      });
      results.push({
        route,
        width,
        mode: 'plain',
        overflow,
        errors: [...errors],
      });
    }
    await context.close();
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: {
      dir: `${directory}/raw-video`,
      size: { width: 1440, height: 1000 },
    },
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: `${directory}/welcome-desktop.png` });
  await page
    .getByRole('button', { name: 'Experience full motion', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.editorial-intro')).toBeVisible();
  await page.waitForTimeout(550);
  await page.screenshot({ path: `${directory}/intro-desktop.png` });
  await expect(page.locator('.editorial-intro')).toHaveCount(0);
  await expect(page.locator('.sculpture-stage')).toHaveAttribute(
    'data-webgl',
    'ready',
  );
  await page.mouse.move(1200, 340);
  await page
    .getByRole('button', { name: 'Select Mapping neighbourhood shade cover' })
    .click();
  await page.waitForTimeout(650);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({
    path: `${directory}/home-desktop-full.png`,
    fullPage: true,
  });
  await page.goto(`${origin}/admin/settings`);
  const features = page.getByRole('group', {
    name: 'Featured articles',
    exact: true,
  });
  await features.scrollIntoViewIfNeeded();
  await page.waitForTimeout(450);
  await page
    .getByRole('button', { name: 'Move featured articles 2 up', exact: true })
    .click();
  await features
    .getByRole('checkbox', { name: /Mapping neighbourhood shade/ })
    .uncheck();
  await page.getByRole('checkbox', { name: /I confirm these edits/ }).check();
  await page
    .getByRole('button', { name: 'Save demo settings', exact: true })
    .click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Homepage/content settings saved' }),
  ).toBeVisible();
  await features.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${directory}/admin-feature-order.png` });
  await features
    .getByRole('link', { name: 'Edit article & cover', exact: true })
    .first()
    .click();
  await page.locator('.admin-cover').scrollIntoViewIfNeeded();
  // Raster fixture is a screenshot of the existing fictional local artwork,
  // used to demonstrate the actual cover input rather than an unsaved preview.
  await page
    .locator('.admin-cover img')
    .screenshot({ path: `${directory}/fixture-cover.png` });
  await page
    .getByLabel('Local article cover', { exact: true })
    .setInputFiles(`${directory}/fixture-cover.png`);
  await page
    .getByLabel('Cover description', { exact: true })
    .fill('Fictional local cover — shared spaces');
  await expect(page.locator('.admin-cover img')).toHaveAttribute(
    'src',
    /^data:image\/png;base64/,
  );
  await page.getByRole('checkbox', { name: /I confirm these edits/ }).check();
  await page
    .getByRole('button', { name: 'Save published demo', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Saved published');
  await page.waitForTimeout(500);
  await page.goto(origin);
  await expect(page.locator('.publication-caption')).toContainText(
    'A library as a shared space',
  );
  await expect(page.locator('.publication-caption a')).toHaveAttribute(
    'href',
    '/articles/a-library-as-a-shared-space',
  );
  await expect(page.locator('.sculpture-stage')).toHaveAttribute(
    'data-cover-count',
    '2',
  );
  await expect(page.locator('.static-volume.is-selected img')).toHaveAttribute(
    'src',
    /^data:image\/png;base64/,
  );
  await expect(page.locator('.sculpture-stage')).toHaveAttribute(
    'data-webgl',
    'ready',
  );
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${directory}/public-after-admin-save.png` });
  await page
    .getByRole('button', {
      name: 'Select Reading the spaces between public decisions cover',
    })
    .click();
  await page.waitForTimeout(600);
  await page.locator('.orbit-stage').scrollIntoViewIfNeeded();
  await page
    .getByRole('button', { name: 'Next research slide', exact: true })
    .click();
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${directory}/carousel-after-admin-save.png` });
  assert.deepEqual(errors, []);
  await page.close();
  await context.close();
  await video.saveAs(`${directory}/admin-to-public-interaction.webm`);
  results.push({
    scenario:
      'Actual local admin reorder, remove feature, upload & save cover, public matching details/link and rotating carousel',
    mode: 'full',
    errors,
  });
  await writeFile(
    `${directory}/capture-checks.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    `Captured ${results.length} responsive and interaction checks in ${directory}`,
  );
} finally {
  await browser.close();
}
