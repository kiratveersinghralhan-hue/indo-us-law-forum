import { spawn } from 'node:child_process';
// Isolated browser-test configuration only. Playwright intercepts every API call.
const child = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    '--host',
    '127.0.0.1',
    '--port',
    '5182',
    '--strictPort',
    '--mode',
    'browser-test',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DATA_MODE: 'supabase',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_transport_test',
    },
  },
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
child.on('exit', (code) => process.exit(code ?? 0));
