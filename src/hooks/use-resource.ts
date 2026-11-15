import { useContext, useEffect, useState } from 'react';
import { ResourceSeedContext } from './resource-seed';

type ResourceState<T> =
  { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error' };

// Callers memoize loaders. Ignore stale completions when filters or routes change.
export function useResource<T>(load: () => Promise<T>, key?: string) {
  const seed = useContext(ResourceSeedContext);
  const [result, setResult] = useState<
    | {
        loader: typeof load;
        state: ResourceState<T>;
      }
    | undefined
  >(() =>
    key && Object.hasOwn(seed, key)
      ? { loader: load, state: { status: 'ready', data: seed[key] as T } }
      : undefined,
  );
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(load)
      .then(
        (data) => {
          if (active)
            setResult({ loader: load, state: { status: 'ready', data } });
        },
        () => {
          if (active) setResult({ loader: load, state: { status: 'error' } });
        },
      );
    return () => {
      active = false;
    };
  }, [load, attempt]);
  return {
    state:
      result?.loader === load
        ? result.state
        : !result && attempt === 0 && key && Object.hasOwn(seed, key)
          ? { status: 'ready' as const, data: seed[key] as T }
          : { status: 'loading' as const },
    retry: () => {
      setResult(undefined);
      setAttempt((current) => current + 1);
    },
  };
}
