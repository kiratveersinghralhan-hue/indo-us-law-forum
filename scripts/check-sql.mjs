import { parse } from 'pgsql-parser';
import { readFile, readdir } from 'node:fs/promises';
for (const folder of ['supabase/migrations', 'supabase/tests']) {
  for (const file of (await readdir(folder)).filter((f) =>
    f.endsWith('.sql'),
  )) {
    await parse(await readFile(`${folder}/${file}`, 'utf8'));
    console.log(`SQL grammar parsed: ${folder}/${file}`);
  }
}
console.log(
  'Parsing only: no migrations executed, PL/pgSQL bodies compiled, roles/RLS evaluated or storage HTTP requests tested.',
);
