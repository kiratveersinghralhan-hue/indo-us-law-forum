import { chooseExperience } from './experience-controls';
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const preference = 'editorial-motion-mode';
const dismissal = 'editorial-motion-welcome-dismissed';
const motion = (page: Page) => page.locator('html');
const count = (page: Page) => page.locator('.carousel-count');

test('vertical touch intent does not freeze an in-flight article selection', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('editorial-motion-mode', 'full');
    localStorage.setItem('editorial-motion-choice-made', '1');
    sessionStorage.setItem('editorial-intro-seen', '1');
  });
  await page.goto('/');
  const stage = page.locator('.orbit-stage');
  await stage.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Next research slide' }).click();
  await stage.dispatchEvent('pointerdown', {
    isPrimary: true,
    pointerType: 'touch',
    pointerId: 77,
    clientX: 100,
    clientY: 100,
  });
  await stage.dispatchEvent('pointermove', {
    isPrimary: true,
    pointerType: 'touch',
    pointerId: 77,
    clientX: 100,
    clientY: 125,
  });
  await expect
    .poll(async () => Number(await stage.getAttribute('data-orbit-angle')))
    .toBe(-120);
  await expect(count(page)).toContainText('02');
});

async function touch(page: Page, dx: number, dy: number) {
  const stage = page.locator('.orbit-stage');
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  const x = box.x + box.width * 0.8,
    y = box.y + box.height * 0.65;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 12; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * i) / 12, y: y + (dy * i) / 12 }],
    });
    await page.waitForTimeout(20);
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await session.detach();
}

for (const width of [390, 768, 1440]) {
  test.describe(`experience choice ${width}px`, () => {
    test.use({
      viewport: { width, height: 900 },
      hasTouch: width < 1025,
      isMobile: width < 769,
      reducedMotion: 'reduce',
    });
    test('fresh visit stays calm; Full is explicit, focus is restored and the choice survives routes/reload', async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      const dialog = page.getByRole('dialog', {
        name: 'How would you like to explore?',
      });
      await expect(dialog).toBeVisible();
      await expect(page.locator('#hero-heading')).toBeVisible();
      await expect(motion(page)).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      await expect(dialog).toContainText('Your system requests reduced motion');
      expect(
        await page.evaluate((key) => localStorage.getItem(key), preference),
      ).toBeNull();
      await expect(dialog.locator('h2')).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(
        dialog.getByRole('button', { name: 'Experience full motion' }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(
        dialog.getByRole('button', { name: 'Dismiss experience choice' }),
      ).toBeFocused();
      await dialog
        .getByRole('button', { name: 'Experience full motion' })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('#main-content')).toBeFocused();
      await expect(motion(page)).toHaveAttribute(
        'data-motion-effective',
        'full',
      );
      await expect(page.locator('html')).toHaveAttribute(
        'data-motion-effective',
        'full',
      );
      await expect(page.locator('.research-orbit')).toHaveCount(1);
      await expect(page.locator('.carousel-viewport')).toHaveCount(0);
      await expect(page.locator('.sculpture-stage')).toHaveAttribute(
        'data-webgl',
        'ready',
      );
      await page.reload();
      await expect(dialog).toHaveCount(0);
      await expect(motion(page)).toHaveAttribute(
        'data-motion-effective',
        'full',
      );
      await page
        .getByRole('link', { name: 'Read articles', exact: true })
        .click();
      await expect(page.locator('h1')).toHaveText('Articles');
      await expect(dialog).toHaveCount(0);
      await page
        .getByRole('link', {
          name: 'The Corridor — Home',
          exact: true,
        })
        .click();
      await expect(page.locator('.research-orbit')).toHaveCount(1);
      await expect(page.locator('canvas')).toHaveCount(1);
      expect(errors).toEqual([]);
    });
    test('Calm remembers Reduced and retains the conventional keyboard carousel and still real scene', async ({
      page,
    }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Plain website' }).click();
      await expect(motion(page)).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      await expect(page.locator('.research-orbit')).toHaveCount(0);
      await page.locator('.sculpture-art').scrollIntoViewIfNeeded();
      await expect(page.locator('.sculpture-stage')).toHaveAttribute(
        'data-webgl',
        'ready',
      );
      await expect(page.locator('canvas')).toHaveAttribute(
        'data-rendering',
        'idle',
      );
      await page.locator('.carousel-viewport').press('End');
      await expect(count(page)).toContainText('03');
      await page.locator('.carousel-viewport').press('ArrowLeft');
      await expect(count(page)).toContainText('02');
      await page.reload();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(motion(page)).toHaveAttribute(
        'data-motion-effective',
        'reduced',
      );
      await chooseExperience(page, 'full');
      await expect(page.locator('.research-orbit')).toHaveCount(1);
      await chooseExperience(page, 'reduced');
      await expect(page.locator('.carousel-viewport')).toHaveCount(1);
      await expect(page.locator('.focus-rows')).not.toHaveAttribute(
        'style',
        /opacity|transform/,
      );
    });
  });
}

test('Escape/dismiss remain calm for this visit without recording an explicit preference', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#main-content')).toBeFocused();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), preference),
  ).toBeNull();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), dismissal),
  ).toBe('1');
  await page.goto('/team');
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(motion(page)).toHaveAttribute(
    'data-motion-effective',
    'reduced',
  );
  // A new visit is simulated by clearing only the site's temporary dismissal.
  await page.evaluate((key) => sessionStorage.removeItem(key), dismissal);
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss experience choice' }).click();
  await expect(motion(page)).toHaveAttribute(
    'data-motion-effective',
    'reduced',
  );
});

test('legacy automatic System preference receives the welcome; legacy System migrates to Plain and footer settings persist the choice', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('editorial-motion-mode') === null)
      localStorage.setItem('editorial-motion-mode', 'system');
  });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(motion(page)).toHaveAttribute(
    'data-motion-effective',
    'reduced',
  );
  await page.getByRole('button', { name: 'Plain website' }).click();
  await chooseExperience(page, 'system');
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(motion(page)).toHaveAttribute(
    'data-motion-effective',
    'reduced',
  );
});

test('360° control cycle, drag versus click, offscreen pause, resize and route cleanup', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Experience full motion' }).click();
  const stage = page.locator('.orbit-stage');
  await stage.press('Home');
  await expect
    .poll(async () => Number(await stage.getAttribute('data-orbit-angle')))
    .toBe(0);
  await expect(stage.locator('a, button, [tabindex]')).toHaveCount(0);
  await expect(stage.locator('.orbit-cover')).toHaveCount(3);
  for (const expected of ['02', '03', '01']) {
    await page.getByRole('button', { name: 'Next research slide' }).click();
    await expect(count(page)).toContainText(expected);
  }
  await stage.press('Home');
  await expect
    .poll(async () => Number(await stage.getAttribute('data-orbit-angle')))
    .toBe(0);
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.55, {
    steps: 16,
  });
  await page.mouse.up();
  await expect(count(page)).toContainText('02');
  await expect(page).toHaveURL(/\/$/); // Drag must not activate an article link.
  await expect
    .poll(async () => Number(await stage.getAttribute('data-orbit-angle')))
    .toBe(-120);
  await page.locator('.orbit-cover.is-selected .orbit-cover-front').click();
  await expect(count(page)).toContainText('02');
  await expect(page).toHaveURL(/\/$/);
  await page
    .locator('.orbit-cover[data-cover-index="0"] .orbit-cover-back')
    .click();
  await expect(count(page)).toContainText('01');
  await expect(page).toHaveURL(/\/$/);
  await page.waitForTimeout(1000);
  await expect(count(page)).toContainText('01'); // Settles, no endless autoplay.
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  const paused = await stage.getAttribute('data-orbit-angle');
  await page.waitForTimeout(200);
  expect(await stage.getAttribute('data-orbit-angle')).toBe(paused);
  await page.setViewportSize({ width: 390, height: 900 });
  await stage.press('End');
  await expect(count(page)).toContainText('03');
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  const retired = await stage.elementHandle();
  const title = await page.locator('.orbit-copy h3').innerText();
  await page
    .locator('.orbit-copy')
    .getByRole('link', { name: 'Read sample article' })
    .click();
  await expect(page.locator('h1')).toHaveText(title);
  await expect(page.locator('.orbit-stage, canvas')).toHaveCount(0);
  await page.mouse.wheel(0, 300);
  expect(await retired!.evaluate((node) => node.isConnected)).toBe(false);
  expect(
    await retired!.evaluate(
      (node) =>
        node.querySelector<HTMLElement>('.orbit-rotor')!.style.transform,
    ),
  ).toBe('');
  expect(errors).toEqual([]);
});

test.describe('Full touch interaction', () => {
  test.use({
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    isMobile: true,
  });
  test('horizontal drag selects without navigating; vertical touch scroll and orientation remain available', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Experience full motion' }).click();
    const stage = page.locator('.orbit-stage');
    await stage.press('Home');
    await expect
      .poll(async () => Number(await stage.getAttribute('data-orbit-angle')))
      .toBe(0);
    const box = (await stage.boundingBox())!;
    await touch(page, -box.width * 0.4, 0);
    await expect(count(page)).toContainText('02');
    await expect
      .poll(async () => Number(await stage.getAttribute('data-orbit-angle')))
      .toBe(-120);
    await stage.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await touch(page, 0, -160);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before + 50);
    await expect(count(page)).toContainText('02');
    await expect(page).toHaveURL(/\/$/);
    await page.setViewportSize({ width: 900, height: 390 });
    await stage.press('ArrowRight');
    await expect(count(page)).toContainText('03');
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  });
});

test('unsupported CSS 3D retains conventional navigation even in explicitly selected Full', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = ((...args: string[]) =>
      args[0] === 'transform-style'
        ? false
        : original(...(args as [string, string]))) as typeof CSS.supports;
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Experience full motion' }).click();
  await expect(page.locator('.orbit-stage')).toHaveCount(0);
  await page.locator('.carousel-viewport').press('End');
  await expect(count(page)).toContainText('03');
  await expect(
    page.locator('.carousel-slide').last().getByRole('link'),
  ).toBeVisible();
});

test('Full reveals replay after leaving a section; scroll depth reverses and Reduced clears effects', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Experience full motion' }).click();
  const rows = page.locator('.focus-rows');
  await rows.scrollIntoViewIfNeeded();
  await expect(rows).toHaveCSS('opacity', '1');
  await page.locator('.site-footer').scrollIntoViewIfNeeded();
  await rows.scrollIntoViewIfNeeded();
  await expect
    .poll(() => rows.evaluate((node) => Number(getComputedStyle(node).opacity)))
    .toBeLessThan(1);
  await expect(rows).toHaveCSS('opacity', '1');
  const camera = page.locator('.orbit-camera');
  await page.locator('.orbit-stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  const initialY = await camera.evaluate(
    (node) => new DOMMatrix(getComputedStyle(node).transform).m42,
  );
  await page.mouse.wheel(0, 240);
  await expect
    .poll(() =>
      camera.evaluate(
        (node) => new DOMMatrix(getComputedStyle(node).transform).m42,
      ),
    )
    .toBeLessThan(initialY - 1);
  await page.mouse.wheel(0, -240);
  await expect
    .poll(() =>
      camera.evaluate(
        (node) => new DOMMatrix(getComputedStyle(node).transform).m42,
      ),
    )
    .toBeGreaterThan(initialY - 1);
  await chooseExperience(page, 'reduced');
  await expect(rows).not.toHaveAttribute('style', /opacity|transform/);
  await expect(page.locator('.orbit-stage')).toHaveCount(0);
  await expect(page.locator('.carousel-viewport')).toHaveCount(1);
});

test('record fresh choice, Full scroll sequence and 360° interaction on the actual homepage', async ({
  browser,
}) => {
  // This recording includes deliberate paced scrolling plus video finalization.
  test.setTimeout(60_000);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    recordVideo: { dir: '.qa/recordings', size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();
  const video = page.video();
  await page.goto('http://127.0.0.1:5181/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: '.qa/public/experience-welcome.png' });
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Experience full motion' }).click();
  await expect(page.locator('.sculpture-stage')).toHaveAttribute(
    'data-webgl',
    'ready',
  );
  await page.mouse.move(1100, 400);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 225);
    await page.waitForTimeout(120);
  }
  await page.locator('.orbit-stage').scrollIntoViewIfNeeded();
  await page.locator('.orbit-stage').press('Home');
  await expect
    .poll(async () =>
      Number(
        await page.locator('.orbit-stage').getAttribute('data-orbit-angle'),
      ),
    )
    .toBe(0);
  await page.screenshot({ path: '.qa/public/experience-360-desktop.png' });
  await page.getByRole('button', { name: 'Next research slide' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Next research slide' }).click();
  await page.waitForTimeout(900);
  const box = (await page.locator('.orbit-stage').boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.55, {
    steps: 24,
  });
  await page.mouse.up();
  await page.waitForTimeout(900);
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(120);
  }
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, -320);
    await page.waitForTimeout(120);
  }
  await page.close();
  await context.close();
  await video!.saveAs('.qa/recordings/experience-360-full.webm');
});
