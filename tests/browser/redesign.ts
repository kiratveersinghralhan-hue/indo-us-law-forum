import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function touchScroll(page: Page) {
  const canvas = (await page.locator('canvas').boundingBox())!;
  const x = canvas.x + canvas.width / 2;
  const y = canvas.y + canvas.height * 0.8;
  const session = await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 10; i++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - (180 * i) / 10 }],
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
  for (const mode of ['full', 'reduced']) {
    test.describe(`publication desk ${width}px ${mode}`, () => {
      test.use({
        viewport: { width, height: 900 },
        hasTouch: width < 1025,
        isMobile: width < 769,
      });
      test('selection reuses the scene, changes depth and article, and preserves vertical scrolling', async ({
        page,
      }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.addInitScript((mode) => {
          localStorage.setItem('editorial-motion-mode', mode);
          sessionStorage.setItem('editorial-intro-seen', '1');
        }, mode);
        await page.goto('/');
        await page.locator('.sculpture-stage').scrollIntoViewIfNeeded();
        await expect(page.locator('.sculpture-stage')).toHaveAttribute(
          'data-webgl',
          'ready',
        );
        const canvas = await page.locator('canvas').elementHandle();
        const oldLink = await page
          .locator('.publication-caption a')
          .getAttribute('href');
        await page
          .getByRole('button', {
            name: 'Select Mapping neighbourhood shade cover',
          })
          .click();
        await expect(
          page.getByRole('button', {
            name: 'Select Mapping neighbourhood shade cover',
          }),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.publication-caption')).toContainText(
          'Mapping neighbourhood shade',
        );
        await expect(
          page.locator('.publication-caption a'),
        ).not.toHaveAttribute('href', oldLink!);
        await expect(page.locator('canvas')).toHaveAttribute(
          'data-selected-cover',
          '2',
        );
        expect(
          await page
            .locator('canvas')
            .evaluate((node, original) => node === original, canvas),
        ).toBe(true);
        await expect
          .poll(async () =>
            Number(
              await page.locator('canvas').getAttribute('data-selection-depth'),
            ),
          )
          .toBeGreaterThan(0.3);
        if (mode === 'reduced') {
          const frames = await page
            .locator('canvas')
            .getAttribute('data-rendered-frames');
          await page.waitForTimeout(200);
          await expect(page.locator('canvas')).toHaveAttribute(
            'data-rendered-frames',
            frames!,
          );
        }
        if (width < 1025) {
          await page.locator('.sculpture-stage').scrollIntoViewIfNeeded();
          const before = await page.evaluate(() => scrollY);
          await touchScroll(page);
          await expect
            .poll(() => page.evaluate(() => scrollY))
            .toBeGreaterThan(before);
          await expect(
            page.getByRole('button', {
              name: 'Select Mapping neighbourhood shade cover',
            }),
          ).toHaveAttribute('aria-pressed', 'true');
        }
        await page.locator('.publication-caption a').click();
        await expect(page.locator('h1')).toHaveText(
          'Mapping neighbourhood shade',
        );
        await expect(page.locator('canvas')).toHaveCount(0);
        expect(errors).toEqual([]);
      });
    });
  }
}

test('unavailable WebGL retains selectable covers and the correct article route', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('editorial-motion-mode', 'reduced');
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
  await expect(page.locator('.sculpture-stage')).toHaveAttribute(
    'data-webgl-status',
    'unavailable',
  );
  await page
    .getByRole('button', { name: 'Select A library as a shared space cover' })
    .focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.static-volume.is-selected img')).toHaveAttribute(
    'src',
    /communities.svg/,
  );
  await expect(page.locator('.publication-caption')).toContainText(
    'A library as a shared space',
  );
  await page.locator('.publication-caption a').click();
  await expect(page.locator('h1')).toHaveText('A library as a shared space');
});

// Proposed addition to tests/browser/redesign.ts (not applied).
for (const width of [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  for (const mode of ['reduced', 'full']) {
    test.describe(`public navigation ${width}px ${mode}`, () => {
      test.use({ viewport: { width, height: 900 }, hasTouch: width <= 1024 });
      test('destinations, drawer isolation, keyboard, offsets and overflow', async ({
        page,
      }) => {
        // This suite runs on the existing mock-only browser-test server.
        await page.route('**/*', (route) => {
          const url = new URL(route.request().url());
          return ['127.0.0.1', 'localhost'].includes(url.hostname)
            ? route.continue()
            : route.abort();
        });
        await page.addInitScript((choice) => {
          localStorage.setItem('editorial-motion-mode', choice);
          localStorage.setItem('editorial-motion-choice-made', '1');
          sessionStorage.setItem('editorial-intro-seen', '1');
        }, mode);
        await page.goto('/');
        const toggle = page.locator('.menu-toggle');
        const nav = page.locator('#primary-navigation');
        if (width <= 1080) {
          await expect(toggle).toBeVisible();
          await toggle.tap();
          await expect(
            page.getByRole('dialog', { name: 'Site menu' }),
          ).toBeVisible();
          await expect(nav.locator('a').first()).toBeFocused();
          expect(
            await page
              .locator('#main-content')
              .evaluate((e) => (e as HTMLElement).inert),
          ).toBe(true);
          await page.keyboard.press('Shift+Tab');
          await expect(toggle).toBeFocused();
          await page.keyboard.press('Shift+Tab');
          await expect(nav.locator('a').last()).toBeFocused();
          await page.keyboard.press('Tab');
          await expect(toggle).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(toggle).toBeFocused();
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          expect(
            await page
              .locator('#main-content')
              .evaluate((e) => (e as HTMLElement).inert),
          ).toBe(false);
          if (width > 560) {
            await toggle.click();
            await page.mouse.click(20, 400);
            await expect(toggle).toBeFocused();
            await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          }
          await toggle.click();
          await page
            .getByRole('button', { name: 'Close menu', exact: true })
            .click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        } else {
          await expect(toggle).toBeHidden();
          for (const link of await nav.locator('a').all())
            await expect(link).toBeVisible();
        }
        for (const path of ['/articles', '/cases', '/team', '/submit', '/']) {
          if (width <= 1080) await toggle.click();
          await nav.locator(`a[href="${path}"]`).click();
          await expect(page).toHaveURL(
            new URL(path, 'http://127.0.0.1:5181').href,
          );
          await expect(page.locator('#main-content')).toBeFocused();
          expect(
            await page
              .locator('#main-content')
              .evaluate((e) => (e as HTMLElement).inert),
          ).toBe(false);
          expect(
            await page.evaluate(() => document.documentElement.style.overflow),
          ).not.toBe('hidden');
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        }
        await page
          .locator('#featured-heading')
          .evaluate((e) => e.scrollIntoView({ block: 'start' }));
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                document
                  .querySelector('#featured-heading')!
                  .getBoundingClientRect().top >=
                document.querySelector('.site-header')!.getBoundingClientRect()
                  .bottom,
            ),
          )
          .toBe(true);
        if (width === 1024) {
          await toggle.click();
          await page.setViewportSize({ width: 1080, height: 900 });
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
          await page.setViewportSize({ width: 1081, height: 900 });
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          expect(
            await page
              .locator('#main-content')
              .evaluate((e) => (e as HTMLElement).inert),
          ).toBe(false);
          await expect(nav).toBeVisible();
        }
      });
    });
  }
}
