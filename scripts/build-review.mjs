import { spawnSync } from 'node:child_process';
import { reviewBackend } from './review-config.mjs';

reviewBackend(process.env);
// npm supplies its JS entry on Windows too; avoid shell interpolation of env values.
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, 'run', 'build:rendered'],
  {
    stdio: 'inherit',
    env: process.env,
  },
);
if (result.error) throw Error('Could not start the rendered build.');
process.exit(result.status ?? 1);
