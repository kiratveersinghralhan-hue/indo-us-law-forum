import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useMediaQuery } from '../hooks/use-media-query';
import { useMotion } from './use-motion';
import { SculptureStatic } from './sculpture-static';
import {
  articleCover,
  heroCoverLimit,
  neutralCover,
} from '../data/article-presentation';
import type { Article } from '../data/types';
import { Link } from 'react-router-dom';
import { paths } from '../config/navigation';
import { useAssetURLs } from '../backend/use-asset-urls';
import { DemoEnvironmentContext } from '../admin/context';

const WebGLScene = lazy(() => import('./webgl-scene'));
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
const emptyArticles: Article[] = [];
export function HeroArtwork({
  articles: sourceArticles = emptyArticles,
}: {
  articles?: Article[];
}) {
  const articles = useAssetURLs(sourceArticles);
  const images = useContext(DemoEnvironmentContext)?.backend?.images;
  const { reduced } = useMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = useMemo(() => articles.slice(0, heroCoverLimit), [articles]);
  // Remember the initially displayed record as well as explicit selections.
  if (visible.length && !visible.some((item) => item.id === selectedId))
    setSelectedId(visible[0].id);
  const covers = useMemo(
    () => (visible.length ? visible.map(articleCover) : [neutralCover]),
    [visible],
  );
  const active = Math.max(
    0,
    visible.findIndex((article) => article.id === selectedId),
  );
  const article = visible[active];
  const select = useCallback(
    (index: number) => {
      if (visible[index]) setSelectedId(visible[index].id);
    },
    [visible],
  );
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  return (
    <div
      className="hero-art sculpture-art"
      role="region"
      aria-label="Publication cover selection"
    >
      <div className="publication-heading">
        <span className="eyebrow">The reading desk</span>
        <span>
          Selected perspectives / {String(visible.length).padStart(2, '0')}
        </span>
      </div>
      <div
        className="sculpture-stage"
        data-motion={reduced ? 'reduced' : 'allowed'}
        data-selected-cover={active}
        data-cover-count={visible.length}
        data-selected-article={article?.id}
      >
        <SculptureStatic
          covers={covers}
          selected={active}
          onCoverError={(index, url) => {
            const id = visible[index]?.coverAssetId;
            if (id) void images?.get(id, url).catch(() => {});
          }}
        />
        <SceneBoundary>
          <Suspense fallback={null}>
            <WebGLScene
              reduced={reduced}
              finePointer={finePointer}
              covers={covers}
              selected={active}
              onSelect={select}
            />
          </Suspense>
        </SceneBoundary>
      </div>
      <div className="publication-controls">
        <p className="publication-hint">
          {!visible.length
            ? 'Publication selection awaits editorial content.'
            : reduced
              ? 'Still volumes. Select a cover below.'
              : 'Move to explore depth. Select a cover.'}
        </p>
        {visible.length > 0 && (
          <div
            className="publication-selectors"
            aria-label="Choose a publication"
          >
            {visible.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={active === index}
                onClick={() => select(index)}
                aria-label={`Select ${item.title} cover`}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {item.categoryLabel}
              </button>
            ))}
          </div>
        )}
        <div
          className="publication-caption"
          aria-live="polite"
          aria-atomic="true"
        >
          {article ? (
            <>
              <p className="eyebrow">
                {article.fictional !== false
                  ? 'Sample article'
                  : 'Selected article'}{' '}
                / {article.readingMinutes} min read
              </p>
              <p className="publication-title">{article.title}</p>
              <p className="publication-excerpt">{article.summary}</p>
              <Link className="text-link" to={paths.article(article.slug)}>
                Read article
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </>
          ) : (
            <>
              <p className="publication-title">
                The next edition is in preparation.
              </p>
              <p>
                Featured articles will appear here once selected for
                publication.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
