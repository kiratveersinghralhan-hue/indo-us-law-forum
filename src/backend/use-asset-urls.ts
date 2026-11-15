import { useCallback, useContext, useMemo, useSyncExternalStore } from 'react';
import { DemoEnvironmentContext } from '../admin/context';
import { neutralCover } from '../data/article-presentation';

export function useAssetURLs<
  T extends { coverAssetId?: string; coverUrl?: string },
>(items: T[]): T[] {
  const store = useContext(DemoEnvironmentContext)?.backend?.images;
  const ids = items.map((item) => item.coverAssetId ?? '').join(',');
  const subscribe = useCallback(
    (notify: () => void) =>
      store?.observe(ids.split(','), notify) ?? (() => {}),
    [store, ids],
  );
  const snapshot = useCallback(
    () =>
      ids
        .split(',')
        .map((id) =>
          store?.unavailable(id) ? neutralCover : (store?.peek(id)?.url ?? ''),
        )
        .join('\n'),
    [store, ids],
  );
  const urls = useSyncExternalStore(subscribe, snapshot, () => '');
  return useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        coverUrl:
          store && item.coverAssetId
            ? urls.split('\n')[index] || item.coverUrl
            : item.coverUrl,
      })),
    [items, store, urls],
  );
}
