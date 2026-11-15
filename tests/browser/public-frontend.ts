import { chooseExperience } from './experience-controls';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Existing System-policy checks simulate a returning visitor. Fresh-visit
// behavior is covered independently in experience.ts.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('editorial-motion-mode') === null) {
      localStorage.setItem('editorial-motion-mode', 'system');
      localStorage.setItem('editorial-motion-choice-made', '1');
    }
  });
});

async function loadedHome(page: Page) {
  await expect(page.locator('#hero-heading')).toBeVisible();
  await expect(page.locator('.research-carousel')).toBeVisible();
}
async function assertImagesAndOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  for (const art of await page.locator('.editorial-art').all()) {
    if (!(await art.evaluate((node) => !!node.closest('.orbit-cover'))))
      await art.scrollIntoViewIfNeeded();
  }
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('.editorial-art img')
        .evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              (node as HTMLImageElement).complete &&
              (node as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page
      .locator('.supporting-stories .article-art-link')
      .evaluateAll((nodes) =>
        nodes.every((node) => {
          const link = node.getBoundingClientRect();
          const art = node.querySelector('figure')!.getBoundingClientRect();
          return art.width <= link.width + 1;
        }),
      ),
  ).toBe(true);
  const carousel = page.locator('.carousel-viewport');
  if (await carousel.count()) {
    await carousel.press('Home');
    await expect
      .poll(() => carousel.evaluate((node) => node.scrollLeft))
      .toBeLessThan(1);
  }
  // Capture from the top so Chromium full-page screenshots do not include the
  // correctly offscreen fixed skip link above the current scrolled viewport.
  await page.locator('.prototype-banner').scrollIntoViewIfNeeded();
}
async function touchSwipeLeft(page: Page) {
  const stage = page.locator('.orbit-stage');
  await stage.scrollIntoViewIfNeeded();
  const viewport = await stage.boundingBox();
  const y = viewport!.y + viewport!.height / 2;
  const session = await page.context().newCDPSession(page);
  const x = viewport!.x + viewport!.width * 0.9;
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 10; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - (viewport!.width * 0.4 * step) / 10, y }],
    });
    await page.waitForTimeout(20);
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await session.detach();
}

for (const width of [320, 375, 390, 695, 768, 1024, 1440]) {
  test.describe(`public Full mode ${width}px`, () => {
    test.use({
      viewport: { width, height: 900 },
      hasTouch: width <= 1024,
      isMobile: width <= 768,
      reducedMotion: 'reduce',
    });
    test('explicit Full works under OS reduction; carousel controls, keyboard, touch and local artwork work', async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await loadedHome(page);
      await expect(page.locator('html')).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      await expect(page.locator('html')).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      await chooseExperience(page, 'full');
      await page.locator('.sculpture-art').scrollIntoViewIfNeeded();
      await expect(page.locator('.sculpture-stage')).toHaveAttribute(
        'data-webgl',
        'ready',
      );
      await expect(page.locator('html')).toHaveAttribute(
        'data-motion-effective',
        'full',
      );
      await expect(page.locator('canvas')).toHaveAttribute(
        'data-rendering',
        'active',
      );
      const before = Number(
        await page.locator('canvas').getAttribute('data-rendered-frames'),
      );
      await expect
        .poll(async () =>
          Number(
            await page.locator('canvas').getAttribute('data-rendered-frames'),
          ),
        )
        .toBeGreaterThan(before);
      await expect(page.locator('.research-carousel')).toHaveCount(1);
      await page.locator('.carousel-controls').scrollIntoViewIfNeeded();
      const count = page.locator('.carousel-count');
      await expect(count).toContainText('01');
      await page
        .getByRole('button', { name: 'Next research slide', exact: true })
        .click();
      await expect(count).toContainText('02');
      await page
        .getByRole('button', { name: 'Next research slide', exact: true })
        .click();
      await expect(count).toContainText('03');
      await expect(
        page.getByRole('button', { name: 'Next research slide', exact: true }),
      ).toBeEnabled();
      await page
        .getByRole('button', { name: 'Previous research slide', exact: true })
        .click();
      await expect(count).toContainText('02');
      await page.locator('.orbit-stage').press('Home');
      await expect(count).toContainText('01');
      await page.locator('.orbit-stage').press('End');
      await expect(count).toContainText('03');
      await page.locator('.orbit-stage').press('ArrowLeft');
      await expect(count).toContainText('02');
      await page.locator('.orbit-stage').press('Home');
      await expect(count).toContainText('01');
      await page.waitForTimeout(350);
      await expect(count).toContainText('01'); // no autoplay
      if (width <= 1024) {
        await expect
          .poll(async () =>
            Math.abs(
              Number(
                await page
                  .locator('.orbit-stage')
                  .getAttribute('data-orbit-angle'),
              ),
            ),
          )
          .toBeLessThan(0.1);
        await touchSwipeLeft(page);
        await expect(count).toContainText('02');
        await expect
          .poll(async () =>
            Number(
              await page
                .locator('.orbit-stage')
                .getAttribute('data-orbit-angle'),
            ),
          )
          .toBe(-120);
      }
      if (width === 390 || width === 768) {
        await page.locator('.orbit-stage').press('Home');
        await expect(count).toContainText('01');
        await assertImagesAndOverflow(page);
        await page.locator('#hero-heading').scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `.qa/public/home-${width}-full.png`,
          fullPage: true,
        });
      }
      await chooseExperience(page, 'reduced');
      await expect(page.locator('html')).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      await page.locator('.sculpture-art').scrollIntoViewIfNeeded();
      await expect(page.locator('canvas')).toHaveAttribute(
        'data-rendering',
        'idle',
      );
      await expect(
        page.locator('.carousel-slide:first-child img'),
      ).not.toHaveAttribute('style', /transform/);
      await page.reload();
      await loadedHome(page);
      await expect(page.locator('html')).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      await assertImagesAndOverflow(page);
      expect(errors).toEqual([]);
    });
  });
}

for (const width of [320, 390, 768, 1440]) {
  test.describe(`public pages ${width}px`, () => {
    test.use({
      viewport: { width, height: 900 },
      hasTouch: width < 1025,
      isMobile: width < 769,
      reducedMotion: 'reduce',
    });
    test('public navigation, sample filters/details/unknown slugs and submission remain usable', async ({
      page,
    }) => {
      const errors: string[] = [];
      const posts: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('request', (request) => {
        if (request.method() === 'POST') posts.push(request.url());
      });
      await page.goto('/');
      await expect(page.locator('#hero-heading')).toBeVisible();
      const menu = page.getByRole('button', { name: 'Open menu', exact: true });
      if (await menu.isVisible()) {
        await menu.press('Enter');
        await expect(
          page.getByRole('button', { name: 'Close menu' }),
        ).toHaveAttribute('aria-expanded', 'true');
        await page.getByRole('button', { name: 'Close menu' }).press('Escape');
        await expect(menu).toBeFocused();
        await menu.click();
      }
      await page
        .getByRole('navigation', { name: 'Primary', exact: true })
        .getByRole('link', { name: 'Team', exact: true })
        .click();
      await expect(page.locator('h1')).toHaveText('The team');
      await expect(page.locator('.team-card')).toHaveCount(3);
      await assertImagesAndOverflow(page);
      if (width !== 320)
        await page.screenshot({
          path: `.qa/public/team-${width}.png`,
          fullPage: true,
        });
      await page.goto('/articles');
      await page
        .getByLabel('Search sample articles', { exact: true })
        .fill('LIBRARY');
      await expect(page.locator('.results-toolbar')).toContainText(
        '1 sample article',
      );
      await expect(
        page.getByLabel('Search sample articles', { exact: true }),
      ).toBeFocused();
      await page.getByLabel('Filter by category').selectOption('environment');
      await expect(page.locator('.state-panel')).toContainText(
        'No samples match',
      );
      await page
        .getByRole('button', { name: 'Reset filters', exact: true })
        .first()
        .click();
      await expect(page.locator('.article-card')).toHaveCount(9);
      await assertImagesAndOverflow(page);
      if (width !== 320)
        await page.screenshot({
          path: `.qa/public/articles-${width}.png`,
          fullPage: true,
        });
      await page
        .getByRole('link', {
          name: 'Reading the spaces between public decisions',
          exact: true,
        })
        .click();
      await expect(page.locator('h1')).toHaveText(
        'Reading the spaces between public decisions',
      );
      await expect(page.locator('.detail-meta')).toContainText('Date pending');
      await expect(page.locator('#related-heading')).toHaveText(
        'Related perspectives',
      );
      await assertImagesAndOverflow(page);
      if (width !== 320)
        await page.screenshot({
          path: `.qa/public/article-detail-${width}.png`,
          fullPage: true,
        });
      await page.goto('/articles/unknown-sample');
      await expect(page.locator('h1')).toHaveText('Article not found');
      await page.goto('/cases');
      await page
        .getByLabel('Search sample cases', { exact: true })
        .fill('LIBRARY');
      await expect(page.locator('.results-toolbar')).toContainText(
        '1 sample record',
      );
      await page
        .getByLabel('Category', { exact: true })
        .selectOption('environment');
      await expect(page.locator('.state-panel')).toContainText(
        'No samples match',
      );
      await page
        .getByRole('button', { name: 'Reset filters', exact: true })
        .first()
        .click();
      await expect(page.locator('.case-row')).toHaveCount(4);
      await page
        .getByLabel('Record type', { exact: true })
        .selectOption('Research note');
      await expect(page.locator('.case-row')).toHaveCount(2);
      await page
        .getByRole('button', { name: 'Reset filters', exact: true })
        .first()
        .click();
      await expect(page.locator('.case-row')).toHaveCount(4);
      await assertImagesAndOverflow(page);
      if (width !== 320)
        await page.screenshot({
          path: `.qa/public/cases-${width}.png`,
          fullPage: true,
        });
      await page
        .getByRole('link', { name: 'A shared library pilot', exact: true })
        .click();
      await expect(page.locator('h1')).toHaveText('A shared library pilot');
      await expect(page.locator('.source-note')).toContainText(
        'Supporting documents are not supplied',
      );
      await expect(
        page.getByRole('list', { name: 'Sample tags' }),
      ).toContainText('library');
      await assertImagesAndOverflow(page);
      if (width !== 320)
        await page.screenshot({
          path: `.qa/public/case-detail-${width}.png`,
          fullPage: true,
        });
      await page.goto('/cases/unknown-sample');
      await expect(page.locator('h1')).toHaveText('Case not found');
      await page.goto('/submit');
      await page.getByRole('button', { name: 'Check required fields' }).click();
      await expect(
        page.getByLabel('Sample article title', { exact: true }),
      ).toBeFocused();
      await expect(page.locator('[aria-invalid=true]')).toHaveCount(3);
      await page
        .getByLabel('Sample article title', { exact: true })
        .fill('Fictional layout check');
      await page
        .getByLabel('Sample summary', { exact: true })
        .fill('A fictional summary for validation.');
      await page
        .getByLabel('Sample outline', { exact: true })
        .fill('A fictional question and an outline.');
      await page.getByRole('button', { name: 'Check required fields' }).click();
      await expect(page.locator('.form-feedback')).toContainText(
        'Nothing has been sent or saved',
      );
      await expect(page.locator('.submission-aside')).toContainText(
        'Prototype — submissions are not sent',
      );
      expect(
        await page.evaluate(() =>
          Object.values(localStorage).some((value) =>
            String(value).includes('Fictional layout check'),
          ),
        ),
      ).toBe(false);
      expect(posts).toEqual([]);
      await assertImagesAndOverflow(page);
      if (width !== 320)
        await page.screenshot({
          path: `.qa/public/submit-${width}.png`,
          fullPage: true,
        });
      await page.goto('/admin');
      await expect(page.locator('h1')).toHaveText('Admin prototype');
      expect(errors).toEqual([]);
    });
  });
}

test('desktop sticky sequence releases, scroll framing and 3D reverse on upward scrolling; record a short Full demo', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    recordVideo: { dir: '.qa/recordings', size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  const video = page.video();
  await page.goto('http://127.0.0.1:5181/');
  await loadedHome(page);
  await page.getByRole('button', { name: 'Experience full motion' }).click();
  await expect(page.locator('.sculpture-stage')).toHaveAttribute(
    'data-webgl',
    'ready',
  );
  await page.mouse.move(1150, 420);
  for (let i = 0; i < 7; i++) {
    await page.mouse.wheel(0, 65);
    await page.waitForTimeout(80);
  }
  await expect
    .poll(async () =>
      Number(await page.locator('canvas').getAttribute('data-depth')),
    )
    .toBeLessThan(-0.1);
  await page.mouse.wheel(0, -455);
  await expect
    .poll(async () =>
      Number(await page.locator('canvas').getAttribute('data-depth')),
    )
    .toBeGreaterThan(-0.04);
  for (let i = 0; i < 26; i++) {
    await page.mouse.wheel(0, 70);
    await page.waitForTimeout(65);
  }
  const carousel = page.locator('.research-carousel');
  await carousel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.qa/public/carousel-desktop.png' });
  await page.getByRole('button', { name: 'Next research slide' }).click();
  await expect(page.locator('.carousel-count')).toContainText('02');
  const story = page.locator('.repository-story');
  await story.scrollIntoViewIfNeeded();
  await expect(page.locator('.repository-intro')).toHaveCSS(
    'position',
    'sticky',
  );
  const image = page.locator('.archive-plate img');
  const before = await image.getAttribute('style');
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 50);
    await page.waitForTimeout(90);
  }
  await expect.poll(() => image.getAttribute('style')).not.toBe(before);
  const downY = await image.evaluate(
    (node) => new DOMMatrix(getComputedStyle(node).transform).m42,
  );
  await page.mouse.wheel(0, -250);
  await expect
    .poll(() =>
      image.evaluate(
        (node) => new DOMMatrix(getComputedStyle(node).transform).m42,
      ),
    )
    .toBeGreaterThan(downY);
  await page.screenshot({ path: '.qa/public/repository-desktop.png' });
  await page.locator('.team-preview').scrollIntoViewIfNeeded();
  const box = await page.locator('.repository-intro').boundingBox();
  expect(box!.y).toBeLessThan(44); // releases with section instead of remaining pinned
  for (let i = 0; i < 36; i++) {
    await page.mouse.wheel(0, -95);
    await page.waitForTimeout(60);
  }
  await assertImagesAndOverflow(page);
  await page.locator('#hero-heading').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: '.qa/public/home-desktop.png',
    fullPage: true,
  });
  await chooseExperience(page, 'reduced');
  await expect(image).not.toHaveAttribute('style', /transform/);
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.locator('.repository-intro')).toHaveCSS(
    'position',
    'static',
  );
  await page.close();
  await context.close();
  await video?.saveAs('.qa/recordings/public-scroll-full.webm');
});
