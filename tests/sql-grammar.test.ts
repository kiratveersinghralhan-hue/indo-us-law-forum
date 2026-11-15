import { expect, it } from 'vitest';
import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'pgsql-parser';
it('parses migration and direct security-test grammar without executing database code', async () => {
  const paths = (
    await Promise.all(
      ['supabase/migrations', 'supabase/tests'].map(async (folder) =>
        (await readdir(folder))
          .filter((f) => f.endsWith('.sql'))
          .map((f) => `${folder}/${f}`),
      ),
    )
  ).flat();
  for (const path of paths) {
    const parsed = await parse(await readFile(path, 'utf8'));
    expect(parsed).toBeTruthy();
  }
});
