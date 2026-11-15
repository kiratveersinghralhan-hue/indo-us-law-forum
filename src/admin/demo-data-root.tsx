import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { ContentProviderContext } from '../data/provider-context';
import { PublicSiteContext } from '../data/site-context';
import { defaultSiteSettings } from '../data/site-settings';
import { HomepageSettingsError } from '../backend/contracts';
import type { WebsiteEnvironment } from '../backend/contracts';
import { DemoEnvironmentContext } from './context';

export function DemoDataRoot({
  environment,
  children,
}: {
  environment: WebsiteEnvironment;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!environment.backend) return;
    const refresh = () => environment.refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [environment]);
  const revision = useSyncExternalStore(
    environment.subscribe,
    environment.getRevision,
    environment.getRevision,
  );
  const reader = useMemo(() => {
    void revision;
    return { ...environment.publicProvider };
  }, [environment, revision]);
  let settings = defaultSiteSettings;
  let error = false;
  let settingsState: HomepageSettingsError['kind'] | undefined;
  try {
    settings = reader.getSiteSettings();
  } catch (cause) {
    error = true;
    if (cause instanceof HomepageSettingsError) settingsState = cause.kind;
  }
  const setupPending = !!environment.backend && settingsState === 'unconfigured';
  const loading = !!environment.backend && settingsState === 'loading';
  return (
    <DemoEnvironmentContext.Provider value={environment}>
      <ContentProviderContext.Provider value={reader}>
        <PublicSiteContext.Provider value={settings}>
          {error && (
            <aside className="demo-store-error" role={setupPending || loading ? 'status' : 'alert'}>
              {environment.backend
                ? setupPending
                  ? 'Homepage setup is awaiting approval.'
                  : loading
                    ? 'Loading homepage settings.'
                    : 'Homepage settings could not be loaded. Please try again.'
                : 'Local demo data is unavailable or invalid.'}{' '}
              Content was not replaced with fallback records.{' '}
              <a href="/admin">
                {environment.backend
                  ? 'Open staff administration to check backend setup.'
                  : 'Open admin to retry or reset demo data.'}
              </a>
            </aside>
          )}
          {children}
        </PublicSiteContext.Provider>
      </ContentProviderContext.Provider>
    </DemoEnvironmentContext.Provider>
  );
}
