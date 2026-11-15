/* global document, MutationObserver, requestAnimationFrame */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const origin = process.argv[2] ?? 'http://127.0.0.1:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw Error('Motion profiling is local only.');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  await page.addInitScript(() => {
    localStorage.setItem('editorial-motion-mode', 'full');
    localStorage.setItem('editorial-motion-choice-made', '1');
    sessionStorage.setItem('editorial-intro-seen', '1');
  });
  await page.goto(origin);
  await page.locator('.orbit-stage').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const result = await page.evaluate(async () => {
    const stage = document.querySelector('.orbit-stage'),
      rotor = document.querySelector('.orbit-rotor');
    const samples = [];
    let last = performance.now();
    const end = last + 2400;
    let copyUpdates = 0;
    const observer = new MutationObserver(() => copyUpdates++);
    observer.observe(document.querySelector('.orbit-copy'), {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const timers = [100, 650, 1200, 1750].map((delay) =>
      setTimeout(
        () =>
          document.querySelector('[aria-label="Next research slide"]').click(),
        delay,
      ),
    );
    await new Promise((resolve) => {
      const tick = (now) => {
        samples.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    timers.forEach(clearTimeout);
    observer.disconnect();
    samples.sort((a, b) => a - b);
    const canvas = document.querySelector('canvas'),
      gl = canvas?.getContext('webgl2'),
      extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      sampleDurationMs: 2400,
      samples: samples.length,
      medianRafMs: samples[Math.floor(samples.length * 0.5)],
      p95RafMs: samples[Math.floor(samples.length * 0.95)],
      selectedCopyDomUpdates: copyUpdates,
      angle: stage?.getAttribute('data-orbit-angle'),
      rotorTransform: rotor?.getAttribute('style'),
      gpu: extension
        ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
        : 'not exposed',
    };
  });
  const report = {
    conditions:
      'Windows, isolated headless Chromium, 1440x900, DPR 1, explicit Full, four Next clicks, no CPU/network throttle. RAF scheduling is not isolated GPU cost or physical-device FPS.',
    ...result,
  };
  await mkdir('.qa', { recursive: true });
  await writeFile('.qa/motion-profile.json', JSON.stringify(report, null, 2));
  await page.screenshot({ path: '.qa/completion-carousel-desktop.png' });
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
