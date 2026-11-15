import type { CSSProperties } from 'react';
import { neutralCover } from '../data/article-presentation';

// This matching composition survives loading, unavailable WebGL and context loss.
export function SculptureStatic({
  covers = [],
  selected = 0,
  onCoverError,
}: {
  covers?: string[];
  selected?: number;
  onCoverError?: (index: number, url: string) => void;
}) {
  return (
    <div
      className="sculpture-static"
      data-testid="sculpture-fallback"
      aria-hidden="true"
      data-cover-count={covers.length}
    >
      {/* The same stele silhouette as the WebGL scene: monolith and plinth. */}
      <span className="static-monolith" />
      <span className="static-plinth" />
      <div className="static-volumes">
        {covers.map((cover, index) => (
          <div
            key={`${cover}-${index}`}
            className={`static-volume ${index === selected ? 'is-selected' : ''}`}
            style={{ '--volume-index': index } as CSSProperties}
          >
            <img
              src={cover}
              alt=""
              onError={(event) => {
                if (cover !== neutralCover) onCoverError?.(index, cover);
                if (!event.currentTarget.src.endsWith(neutralCover))
                  event.currentTarget.src = neutralCover;
              }}
            />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}
