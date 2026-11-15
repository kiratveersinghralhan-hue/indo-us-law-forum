import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import pgsql from 'pgsql-parser';

// Explicitly authorized dedicated project only; never infer a remote target.
const ref = 'erwliwgbjlutczmtqoss';
assert.equal(
  process.env.VERIFY_DEDICATED_PROJECT,
  ref,
  'Explicit target confirmation required',
);
assert.equal(
  readFileSync('supabase/.temp/project-ref', 'utf8').trim(),
  ref,
  'Linked target mismatch',
);
const folder = resolve('.qa/dedicated-backend/sql');
mkdirSync(folder, { recursive: true });
const cli = (...args) => {
  try {
    return JSON.parse(
      execFileSync(
        process.execPath,
        ['node_modules/supabase/dist/supabase.js', ...args, '--output', 'json'],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 120000,
        },
      ),
    );
  } catch (error) {
    // SQL files contain only labelled transaction fixtures, never credentials.
    throw Error(
      `Dedicated SQL check failed: ${error.stderr?.toString() ?? 'CLI unavailable'}`,
      { cause: error },
    );
  }
};
const report = [];
// Existing pgTAP suites use collection totals and a singleton homepage. Run
// only during empty-project commissioning, never alongside the HTTP runner or
// after approved client content has been entered. No data is cleared to pass.
const preflight = cli(
  'db',
  'query',
  '--linked',
  '--project-ref',
  ref,
  'select not exists(select 1 from public.articles) and not exists(select 1 from public.cases) and not exists(select 1 from public.team_profiles) and not exists(select 1 from public.homepage_settings) and not exists(select 1 from public.submissions) and not exists(select 1 from public.editorial_assets) and not exists(select 1 from storage.objects) as empty_commissioning_project;',
);
assert.equal(
  preflight.rows[0]?.empty_commissioning_project,
  true,
  'SQL suite requires an empty commissioning project; wait for HTTP cleanup and never remove approved content',
);
for (const name of [
  'security',
  'notifications',
  'managed_features',
  'privileges',
]) {
  const source = readFileSync(`supabase/tests/${name}.test.sql`, 'utf8');
  const parsed = await pgsql.parse(source);
  const statements = parsed.stmts ?? parsed;
  const replacements = [];
  for (const entry of statements) {
    const start = entry.stmt_location ?? 0;
    const end = entry.stmt_len ? start + entry.stmt_len : source.length;
    const statement = source.slice(start, end);
    if (
      /^\s*select\s+(is|ok|throws_ok|lives_ok|is_empty)\s*\(/i.test(statement)
    ) {
      replacements.push([
        start,
        end,
        `\ninsert into pg_temp.verification_tap(result) ${statement.trim()}`,
      ]);
    }
  }
  let sql = source;
  for (const [start, end, replacement] of replacements.reverse())
    sql = sql.slice(0, start) + replacement + sql.slice(end);
  sql = sql.replace(
    'select no_plan();',
    `select no_plan();
create temporary table verification_tap(sequence bigint generated always as identity, result text);
grant select, insert on pg_temp.verification_tap to anon, authenticated;
grant usage on sequence pg_temp.verification_tap_sequence_seq to anon, authenticated;`,
  );
  sql = sql.replace(
    'select * from finish();',
    `insert into pg_temp.verification_tap(result) select * from finish();
select result from pg_temp.verification_tap order by sequence;`,
  );
  const file = resolve(folder, `${name}.sql`);
  writeFileSync(file, sql);
  const response = cli(
    'db',
    'query',
    '--linked',
    '--project-ref',
    ref,
    '--file',
    file,
  );
  const results = response.rows.map((row) => row.result);
  writeFileSync(
    resolve(folder, `${name}.json`),
    JSON.stringify(results, null, 2),
  );
  assert.ok(
    results.some((line) => /^ok \d+/.test(line)),
    'No TAP assertions captured',
  );
  assert.ok(
    !results.some((line) => /^not ok|failed|Looks like/i.test(line)),
    `${name}: ${results.filter((line) => !/^ok \d+|^1\.\./.test(line)).join('; ')}`,
  );
  const checks = results.filter((line) => /^ok \d+/.test(line)).length;
  report.push({ suite: name, checks, rolledBack: true });
  console.log(
    `${name}: ${checks} real database assertions passed; fixtures rolled back.`,
  );
}
writeFileSync(resolve(folder, 'summary.json'), JSON.stringify(report, null, 2));
