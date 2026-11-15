import { expect, type Page } from '@playwright/test';

export async function chooseExperience(
  page: Page,
  mode: 'full' | 'reduced' | 'system',
) {
  const position = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  await page
    .getByRole('button', { name: 'Experience settings', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: mode === 'full' ? 'Experience full motion' : 'Plain website',
      exact: true,
    })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(
    ({ x, y }) => scrollTo({ left: x, top: y, behavior: 'instant' }),
    position,
  );
}
