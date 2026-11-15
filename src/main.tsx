import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './router';
import { DemoDataRoot } from './admin/demo-data-root';
import { createAppProviders } from './admin/mock-admin-provider';
import { MotionPreferences } from './motion/preferences';
import './styles.css';
import './public-design.css';
import './managed-finish.css';
import './stele.css';
import type { WebsiteEnvironment } from './backend/contracts';
import { readBackendConfig } from './backend/config';
import { ResourceBootstrap } from './components/resource-bootstrap';
// Explicit data mode: configured backend errors never substitute demo records.
async function start() {
  const config = readBackendConfig(import.meta.env);
  const environment: WebsiteEnvironment = config
    ? (await import('./backend/provider')).createBackendEnvironment(config)
    : createAppProviders(
        'local-demo',
        {
          getItem: (key) => window.localStorage.getItem(key),
          setItem: (key, value) => window.localStorage.setItem(key, value),
        },
        window,
      );
  import.meta.hot?.dispose(() => environment.dispose?.());

  const seedElement = document.getElementById('public-resource-seed');
  let seed = {};
  try {
    seed = JSON.parse(seedElement?.textContent ?? '{}');
  } catch {
    /* No seed on ordinary Vite pages. */
  }
  seedElement?.remove();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ResourceBootstrap initial={seed}>
        <DemoDataRoot environment={environment}>
          <MotionPreferences>
            <AppRouter />
          </MotionPreferences>
        </DemoDataRoot>
      </ResourceBootstrap>
    </StrictMode>,
  );
}
void start().catch(() => {
  // Never print credentials, replace the failed backend with fixtures or send telemetry.
  createRoot(document.getElementById('root')!).render(
    <main className="container state-panel">
      <h1>Website configuration unavailable</h1>
      <p>
        Check the explicit data mode and dedicated backend configuration. No
        sample content was loaded.
      </p>
    </main>,
  );
});
