import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ResourceSeedContext } from '../hooks/resource-seed';

export function ResourceBootstrap({
  initial,
  children,
}: {
  initial: Record<string, unknown>;
  children: ReactNode;
}) {
  const [seed, setSeed] = useState(initial);
  // Mounted hooks retain their initial result; later navigation cannot resurrect
  // an old server snapshot after unpublication or a slug change.
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setSeed({});
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <ResourceSeedContext.Provider value={seed}>
      {children}
    </ResourceSeedContext.Provider>
  );
}
