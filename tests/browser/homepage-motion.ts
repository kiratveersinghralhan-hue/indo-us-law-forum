import { chooseExperience } from './experience-controls';
import { motionSettings } from '../../src/config/motion';
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

const widths = [320, 375, 390, 695, 768, 1024, 1440];
const stage = '.sculpture-stage';
const canvas = `${stage} canvas`;

async function ready(page: Page) {
  await page.locator('.sculpture-art').scrollIntoViewIfNeeded();
  await expect(page.locator(stage)).toHaveAttribute('data-webgl', 'ready');
  await expect(page.locator(canvas)).toHaveCount(1);
}
// Observe entry and allow its scheduled frame to finish before measuring idle.
// A resize/scroll can legitimately leave one dirty Plain frame pending.
async function plainFrameReady(page: Page) {
  await page.locator(canvas).scrollIntoViewIfNeeded();
  await page.locator(canvas).evaluate(
    (element) => new Promise<void>((resolve) => {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }, { threshold: 0.01 });
      observer.observe(element);
    }),
  );
  await expect(page.locator(canvas)).toHaveAttribute('data-rendering', 'idle');
}
async function frames(page: Page) {
  return Number(
    await page.locator(canvas).getAttribute('data-rendered-frames'),
  );
}
async function depth(page: Page) {
  return Number(await page.locator(canvas).getAttribute('data-depth'));
}
async function swipe(page: Page, x: number, y: number, distance: number) {
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 8; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - (distance * step) / 8 }],
    });
    await page.waitForTimeout(16);
  }
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await session.detach();
}

for (const width of widths) {
  for (const reduced of [false, true]) {
    test.describe(`${width}px / ${reduced ? 'reduced' : 'allowed'}`, () => {
      test.use({
        viewport: { width, height: 900 },
        deviceScaleFactor: 2,
        hasTouch: width <= 1024,
        isMobile: width <= 768,
        reducedMotion: reduced ? 'reduce' : 'no-preference',
      });
      test('regular homepage: real scene, responsive framing, motion policy and route cleanup', async ({
        page,
      }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.addInitScript(
          (mode) => localStorage.setItem('editorial-motion-mode', mode),
          reduced ? 'reduced' : 'full',
        );
        await page.goto('/');
        await expect(
          page.getByRole('heading', {
            name: 'Research across borders. Ideas in dialogue.',
          }),
        ).toBeVisible();
        await ready(page);
        await expect(page.locator('.sculpture-static')).toHaveCSS(
          'opacity',
          '0',
        );
        await expect(page.locator(canvas)).toHaveAttribute('tabindex', '-1');
        await expect(page.locator(stage)).toHaveAttribute(
          'data-motion',
          reduced ? 'reduced' : 'allowed',
        );
        const layout = await page.evaluate(() => {
          const art = document
            .querySelector('.sculpture-stage')!
            .getBoundingClientRect();
          const copy = document
            .querySelector('.hero-copy')!
            .getBoundingClientRect();
          const canvas = document.querySelector('canvas')!;
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            overlap:
              art.left < copy.right &&
              art.right > copy.left &&
              art.top < copy.bottom &&
              art.bottom > copy.top,
            ratio: canvas.width / art.width,
            width: art.width,
            height: art.height,
          };
        });
        expect(layout.overflow).toBe(false);
        expect(layout.overlap).toBe(false);
        expect(layout.ratio).toBeLessThanOrEqual(
          (width <= 768 || layout.width < 300
            ? 1
            : width <= 1024
              ? 1.25
              : 1.5) + 0.01,
        );
        if (reduced) await plainFrameReady(page);
        const initialFrames = await frames(page);
        await page.waitForTimeout(250);
        if (reduced) {
          expect(await frames(page)).toBe(initialFrames);
          expect(await depth(page)).toBe(0);
          await expect(page.locator(canvas)).toHaveAttribute(
            'data-rotation',
            '-0.090,-0.220',
          );
        } else {
          expect(await frames(page)).toBeGreaterThan(initialFrames);
          const initialDepth = await depth(page);
          const scroll = await page.evaluate(() => scrollY);
          if (width <= 1024) {
            const rect = await page.locator(canvas).boundingBox();
            await swipe(
              page,
              rect!.x + rect!.width / 2,
              Math.min(rect!.y + rect!.height / 2, 790),
              250,
            );
          } else {
            const rect = await page.locator(canvas).boundingBox();
            await page.mouse.move(rect!.x + rect!.width - 20, rect!.y + 40);
            await expect
              .poll(() => page.locator(canvas).getAttribute('data-rotation'))
              .not.toBe('-0.090,-0.220');
            await page.mouse.wheel(0, 250);
          }
          await expect
            .poll(() => page.evaluate(() => scrollY))
            .toBeGreaterThan(scroll);
          await expect.poll(() => depth(page)).toBeLessThan(initialDepth);
          if (width <= 1024)
            await expect(page.locator(canvas)).toHaveAttribute(
              'data-pointer',
              '0.000,0.000',
            );
        }

        // Rotation/orientation resize on the existing canvas, not a new route or fixture.
        await page.setViewportSize({ width: 900, height: width });
        await ready(page);
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true);
        if (reduced) {
          await plainFrameReady(page);
          const resizedFrames = await frames(page);
          await page.waitForTimeout(200);
          expect(await frames(page)).toBe(resizedFrames);
        }
        await page.setViewportSize({ width, height: 900 });
        await ready(page);
        if (width === 390 || width === 1440)
          await page.screenshot({
            path: `.qa/home-${width}-${reduced ? 'still' : 'motion'}.png`,
          });

        // Offscreen rendering stops; normal native scroll stays available.
        await page.locator('.contribute').scrollIntoViewIfNeeded();
        await expect(page.locator(canvas)).toHaveAttribute(
          'data-rendering',
          'paused',
        );
        const paused = await frames(page);
        await page.waitForTimeout(200);
        expect(await frames(page)).toBe(paused);
        await page
          .getByRole('link', { name: 'Read articles', exact: true })
          .click();
        await expect(page).toHaveURL(/\/articles$/);
        await expect(page.locator(canvas)).toHaveCount(0);
        await page
          .getByRole('link', {
            name: 'The Corridor — Home',
            exact: true,
          })
          .click();
        await ready(page);
        expect(errors).toEqual([]);
      });
    });
  }
}

test('live preference changes retain real 3D, revoke motion and keep navigation usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  await chooseExperience(page, 'reduced');
  await ready(page);
  await expect(page.locator(stage)).toHaveAttribute('data-motion', 'reduced');
  const still = await frames(page);
  await page.waitForTimeout(200);
  expect(await frames(page)).toBe(still);
  await chooseExperience(page, 'system');
  await ready(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute(
    'data-motion-effective',
    'reduced',
  );
  await expect(page.locator(canvas)).toHaveAttribute('data-rendering', 'idle');
  await expect(
    page.locator('.carousel-slide:first-child .editorial-art img'),
  ).not.toHaveAttribute('style', /transform/);
});

test('regular homepage keeps matching fallback and navigation on unavailable WebGL', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator(stage)).toHaveAttribute(
    'data-webgl-status',
    'unavailable',
  );
  await expect(page.locator(canvas)).toHaveCount(0);
  await expect(page.locator('.sculpture-static')).toHaveCSS('opacity', '1');
  await page.getByRole('link', { name: 'Read articles', exact: true }).click();
  await expect(page).toHaveURL(/\/articles$/);
});

test('regular homepage restores fallback after actual WebGL context loss', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  const supported = await page.locator(canvas).evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext('webgl2');
    const extension = context?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  });
  expect(supported).toBe(true);
  await expect(page.locator(stage)).toHaveAttribute(
    'data-webgl-status',
    'context-lost',
  );
  await expect(page.locator(canvas)).toHaveCount(0);
  await expect(page.locator('.sculpture-static')).toHaveCSS('opacity', '1');
});

test.describe('touch editorial motion', () => {
  test.use({
    viewport: { width: 390, height: 900 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
  });
  test('small-screen featured parallax and section reveals progress with scroll; cards do not tilt', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem('editorial-motion-mode', 'full'),
    );
    await page.goto('/');
    await expect(page.locator('#hero-heading')).toBeVisible();
    const visual = page.locator('.orbit-camera');
    await expect(visual).toHaveAttribute('style', /transform/);
    const initial = await visual.getAttribute('style');
    await visual.scrollIntoViewIfNeeded();
    await expect.poll(() => visual.getAttribute('style')).not.toBe(initial);
    const intro = page.locator('.section-heading').first();
    await intro.scrollIntoViewIfNeeded();
    await expect
      .poll(() => intro.getAttribute('style'))
      .not.toMatch(/transform/);
    const card = page.locator('.article-card').first();
    await card.scrollIntoViewIfNeeded();
    const bounds = await card.boundingBox();
    await page.mouse.move(bounds!.x + bounds!.width - 10, bounds!.y + 10);
    await expect(card).not.toHaveAttribute('style', /transform/);
    await chooseExperience(page, 'reduced');
    await expect(visual).toHaveCount(0);
  });
});

test('fine-pointer featured cards retain gentle tilt and clear it when motion is reduced', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() =>
    localStorage.setItem('editorial-motion-mode', 'full'),
  );
  await page.goto('/');
  const card = page.locator('.article-card').first();
  await card.scrollIntoViewIfNeeded();
  const rect = await card.boundingBox();
  await page.mouse.move(rect!.x + rect!.width - 10, rect!.y + 10);
  await expect(card).toHaveAttribute('style', /perspective/);
  await chooseExperience(page, 'reduced');
  await expect(card).not.toHaveAttribute('style', /transform/);
});

test.describe('compact demand rendering and native scroll', () => {
  test.use({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  test('sleeps after settling, wakes for touch scrolling, and keeps phone headings clear', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('editorial-motion-mode', 'full');
      sessionStorage.setItem('editorial-intro-seen', '1');
    });
    await page.goto('/');
    await ready(page);
    await expect(page.locator(canvas)).toHaveAttribute('data-rendering', 'idle', { timeout: 10000 });
    const idle = await frames(page);
    await page.waitForTimeout(300);
    expect(await frames(page)).toBe(idle);
    const box = (await page.locator(canvas).boundingBox())!;
    const initialScroll = await page.evaluate(() => scrollY);
    await swipe(page, box.x + box.width / 2, Math.min(box.y + box.height * 0.8, 790), 120);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(initialScroll);
    expect(await frames(page)).toBeGreaterThan(idle);
    await page.locator('#focus-heading').evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await expect(page.locator('.site-header')).toHaveCSS('position', 'relative');
    const clear = await page.evaluate(() => document.querySelector('.site-header')!.getBoundingClientRect().bottom <= document.querySelector('#focus-heading')!.getBoundingClientRect().top);
    expect(clear).toBe(true);
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Site menu' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toBeFocused();
  });
});

for (const width of [390, 1440]) {
  test.describe('Full research anchor clearance at ' + width + 'px', () => {
    test.use({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
    test('keeps the returned heading clear after the reveal settles', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('editorial-motion-mode', 'full');
        sessionStorage.setItem('editorial-intro-seen', '1');
      });
      await page.goto('/');
      await ready(page);
      await page.locator('.site-footer').scrollIntoViewIfNeeded();
      await page.locator('#focus-heading').evaluate(element =>
        element.scrollIntoView({ block: 'start', behavior: 'instant' }),
      );
      // Check final geometry after the configured reveal, including its cleanup.
      await page.waitForTimeout(Math.ceil(motionSettings.revealDuration * 1000) + 100);
      const clearance = await page.evaluate(() => {
        const heading = document.querySelector('#focus-heading')!.getBoundingClientRect();
        const header = document.querySelector('.site-header')!.getBoundingClientRect();
        return heading.top - Math.max(0, header.bottom);
      });
      expect(clearance).toBeGreaterThanOrEqual(8);
    });
  });
}
