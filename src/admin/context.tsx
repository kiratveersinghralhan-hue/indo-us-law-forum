import { createContext, useContext } from 'react';
import type { WebsiteEnvironment } from '../backend/contracts';
export const DemoEnvironmentContext = createContext<WebsiteEnvironment | null>(
  null,
);
export function useDemoEnvironment() {
  const env = useContext(DemoEnvironmentContext);
  if (!env) throw Error('An explicit demo provider is required.');
  return env;
}
