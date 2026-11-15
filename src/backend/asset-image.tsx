import { useContext, useMemo } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { DemoEnvironmentContext } from '../admin/context';
import { neutralCover } from '../data/article-presentation';
import { useAssetURLs } from './use-asset-urls';

export function AssetImage({
  assetId,
  fallback = neutralCover,
  src,
  onError,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  assetId?: string;
  fallback?: string;
}) {
  const store = useContext(DemoEnvironmentContext)?.backend?.images;
  const input = useMemo(
    () => [{ coverAssetId: assetId, coverUrl: src }],
    [assetId, src],
  );
  const [asset] = useAssetURLs(input);
  return (
    <img
      {...props}
      src={asset.coverUrl || fallback}
      onError={(event) => {
        const failed = event.currentTarget.src;
        if (
          store &&
          assetId &&
          failed !== new URL(fallback, window.location.href).href
        )
          void store.get(assetId, failed).catch(() => {});
        if (!failed.endsWith(fallback)) event.currentTarget.src = fallback;
        onError?.(event);
      }}
    />
  );
}
