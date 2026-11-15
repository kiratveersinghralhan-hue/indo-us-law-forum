/* global document, scrollTo, innerWidth */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const directory = '.qa/redesign';
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
    for (const route of ['/', '/articles', '/cases', '/team', '/submit']) {
      await page.goto(`http://127.0.0.1:5173${route}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.locator('h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      // Load offscreen images through their actual browser loading path.
      for (const art of await page.locator('.editorial-art').all())
        await art.scrollIntoViewIfNeeded();
      // Loading other slides can move the horizontal reading viewport. Restore
      // the first spread before capturing the full page from the top.
      const readingViewport = page.locator('.carousel-viewport');
      if (await readingViewport.count())
        await readingViewport.evaluate((node) =>
          node.scrollTo({ left: 0, behavior: 'instant' }),
        );
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      assert.equal(overflow, false, `${route} overflow at ${width}px`);
      assert.deepEqual(errors, []);
      const name = route === '/' ? 'home' : route.slice(1);
      await page.screenshot({
        path: `${directory}/${name}-${device}-reduced.png`,
        fullPage: true,
      });
      results.push({
        route,
        width,
        mode: 'reduced',
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
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('dialog').waitFor();
  await page.screenshot({ path: `${directory}/motion-dialog-desktop.png` });
  await page.getByRole('button', { name: 'Enable full experience' }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${directory}/intro-desktop.png` });
  await page.waitForTimeout(1500);
  await page.locator('.sculpture-stage[data-webgl="ready"]').waitFor();
  await page.screenshot({ path: `${directory}/home-desktop-full.png` });
  const rect = await page.locator('canvas').boundingBox();
  await page.mouse.move(rect.x + 40, rect.y + 50);
  await page.mouse.move(rect.x + rect.width - 50, rect.y + rect.height - 50, {
    steps: 35,
  });
  await page.waitForTimeout(500);
  for (const name of ['Communities', 'Environment', 'Institutions']) {
    await page.getByRole('button', { name: `Select ${name} cover` }).click();
    await page.waitForTimeout(600);
  }
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 70);
    await page.waitForTimeout(80);
  }
  await page.locator('.orbit-stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${directory}/carousel-desktop-full.png` });
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Next research slide' }).click();
    await page.waitForTimeout(800);
  }
  await page.locator('.repository-story').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${directory}/repository-desktop-full.png` });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1100);
  await context.close();
  await video.saveAs(`${directory}/homepage-interaction.webm`);
  await writeFile(
    `${directory}/capture-checks.json`,
    JSON.stringify(results, null, 2),
  );
  console.log(
    `Captured ${results.length} responsive page layouts, Full interactions, intro, dialog and homepage-interaction.webm in ${directory}.`,
  );
} finally {
  await browser.close();
}
