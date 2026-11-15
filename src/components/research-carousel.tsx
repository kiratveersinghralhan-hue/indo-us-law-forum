import {
  Component,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { KeyboardEvent } from 'react';
import type { Article } from '../data/types';
import { paths } from '../config/navigation';
import { useMotion } from '../motion/use-motion';
import { EditorialArtwork } from './content';
import { TextLink } from './ui';
import { mountArticleOrbit, wrapArticleIndex } from '../motion/article-orbit';

// Native horizontal scroll/snap gives touch swiping without gesture interception.
// Controls and keyboard navigation keep every slide reachable without dragging.
export function ResearchCarousel({ articles }: { articles: Article[] }) {
  const { mode, reduced } = useMotion();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (articles.length && !articles.some((item) => item.id === selectedId))
    setSelectedId(articles[0].id);
  const active = Math.max(
    0,
    articles.findIndex((article) => article.id === selectedId),
  );
  const setActive = useCallback(
    (index: number) => setSelectedId(articles[index]?.id ?? null),
    [articles],
  );
  const [supported] = useState(
    () =>
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('transform-style', 'preserve-3d') &&
      CSS.supports('perspective', '600px'),
  );
  const conventional = (
    <ConventionalCarousel
      articles={articles}
      active={active}
      onSelect={setActive}
    />
  );
  return mode === 'full' && !reduced && supported ? (
    <OrbitBoundary fallback={conventional}>
      <OrbitCarousel articles={articles} active={active} onSelect={setActive} />
    </OrbitBoundary>
  ) : (
    conventional
  );
}
class OrbitBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
type CarouselProps = {
  articles: Article[];
  active: number;
  onSelect: (index: number) => void;
};
function ConventionalCarousel({ articles, active, onSelect }: CarouselProps) {
  const { reduced } = useMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const current = useRef(active);
  const [initial] = useState(active);
  useEffect(() => {
    const node = viewport.current;
    const slides = node?.querySelectorAll<HTMLElement>('.carousel-slide');
    if (node && slides?.[initial])
      node.scrollTo({
        left: slides[initial].offsetLeft - slides[0].offsetLeft,
        behavior: 'instant',
      });
  }, [initial]);
  const id = useId();
  if (!articles.length) return null;
  function goTo(index: number) {
    const node = viewport.current;
    if (!node) return;
    const slides = node.querySelectorAll<HTMLElement>('.carousel-slide');
    const target = Math.max(0, Math.min(articles.length - 1, index));
    node.scrollTo({
      left: slides[target].offsetLeft - slides[0].offsetLeft,
      behavior: reduced ? 'instant' : 'smooth',
    });
  }
  function syncIndex() {
    const node = viewport.current;
    if (!node) return;
    const slides = [...node.querySelectorAll<HTMLElement>('.carousel-slide')];
    const distances = slides.map((slide) =>
      Math.abs(slide.offsetLeft - slides[0].offsetLeft - node.scrollLeft),
    );
    const index = distances.indexOf(Math.min(...distances));
    if (current.current !== index) {
      current.current = index;
      onSelect(index);
    }
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const keys: Record<string, number> = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: articles.length - 1,
    };
    if (event.key in keys) {
      event.preventDefault();
      goTo(keys[event.key]);
    }
  }
  return (
    <div
      className="research-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured research carousel"
    >
      <p className="sr-only" id={`${id}-instructions`}>
        Use previous and next controls, choose a slide, or focus the slide area
        and use Left, Right, Home and End. Swipe horizontally on touch screens.
        No automatic slide changes.
      </p>
      <div
        ref={viewport}
        id={id}
        className="carousel-viewport"
        tabIndex={0}
        aria-label="Featured research slides"
        aria-describedby={`${id}-instructions`}
        onScroll={syncIndex}
        onKeyDown={keyDown}
      >
        {articles.map((article, index) => (
          <article
            className="carousel-slide"
            key={article.slug}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${articles.length}: ${article.title}`}
          >
            <div className="carousel-art-frame">
              <EditorialArtwork
                artwork={article.artwork}
                asset={article}
                eager={index === 0}
              />
            </div>
            <div className="carousel-copy">
              <div className="carousel-kicker">
                <p className="eyebrow">{article.categoryLabel}</p>
                {article.fictional !== false && (
                  <span className="sample-tag">Sample article</span>
                )}
              </div>
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <p className="carousel-meta">
                {article.sampleAuthor} <span aria-hidden="true">/</span>{' '}
                {article.readingMinutes} min
                {article.fictional !== false ? ' sample' : ''} read
              </p>
              <TextLink to={paths.article(article.slug)}>
                {article.fictional !== false
                  ? 'Read sample article'
                  : 'Read article'}
              </TextLink>
            </div>
          </article>
        ))}
      </div>
      <div className="carousel-controls">
        <p className="carousel-count" role="status" aria-live="polite">
          <span className="sr-only">Slide </span>
          {String(active + 1).padStart(2, '0')}{' '}
          <span>/ {String(articles.length).padStart(2, '0')}</span>
        </p>
        <div className="carousel-progress" aria-hidden="true">
          <span
            style={{ width: `${((active + 1) / articles.length) * 100}%` }}
          />
        </div>
        <div className="carousel-dots">
          {articles.map((article, index) => (
            <button
              type="button"
              key={article.slug}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === active ? 'true' : undefined}
              aria-controls={id}
              onClick={() => goTo(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <div className="carousel-arrows">
          <button
            type="button"
            aria-label="Previous research slide"
            aria-controls={id}
            disabled={active === 0}
            onClick={() => goTo(active - 1)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next research slide"
            aria-controls={id}
            disabled={active === articles.length - 1}
            onClick={() => goTo(active + 1)}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

function OrbitCarousel({ articles, active, onSelect }: CarouselProps) {
  const stage = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof mountArticleOrbit> | null>(null);
  const [initial] = useState(active);
  const id = useId();
  useEffect(() => {
    if (!stage.current || !articles.length) return;
    const engine = mountArticleOrbit(
      stage.current,
      articles.length,
      initial,
      onSelect,
    );
    controller.current = engine;
    return () => {
      engine.dispose();
      controller.current = null;
    };
  }, [articles, initial, onSelect]);
  if (!articles.length) return null;
  const article = articles[active] ?? articles[0];
  const select = (index: number) => controller.current?.select(index);
  return (
    <div
      className="research-carousel research-orbit"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured research carousel"
    >
      <div className="orbit-layout">
        <div className="orbit-visual">
          <p className="orbit-instruction" id={`${id}-instructions`}>
            Drag to turn · Select a cover · Or use the controls
          </p>
          <div
            ref={stage}
            className="orbit-stage"
            id={id}
            tabIndex={0}
            role="group"
            aria-label="Interactive article covers"
            aria-describedby={`${id}-instructions`}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              const keys: Record<string, number> = {
                ArrowLeft: active - 1,
                ArrowRight: active + 1,
                Home: 0,
                End: articles.length - 1,
              };
              if (event.key in keys) {
                event.preventDefault();
                select(keys[event.key]);
              }
            }}
          >
            <div className="orbit-camera" aria-hidden="true">
              <div className="orbit-rotor">
                {articles.map((item, index) => (
                  <div
                    key={item.slug}
                    data-cover-index={index}
                    className={`orbit-cover ${index === active ? 'is-selected' : ''}`}
                    style={{
                      transform: `rotateY(${(index * 360) / articles.length}deg) translateZ(var(--orbit-radius, 180px))`,
                    }}
                  >
                    {/* Covers carry artwork and an index only. Titles, summaries
                        and links live in the stable copy panel, never on a
                        rotating face where they would clip or mirror. */}
                    <div className="orbit-cover-front">
                      <EditorialArtwork
                        artwork={item.artwork}
                        asset={item}
                        eager
                      />
                      <span className="orbit-cover-index">
                        {String(index + 1).padStart(2, '0')}
                        <span>
                          / {String(articles.length).padStart(2, '0')}
                        </span>
                      </span>
                    </div>
                    <div className="orbit-cover-back">
                      <span className="orbit-back-mark" />
                      <span className="orbit-cover-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="orbit-cover-spine" />
                    <span className="orbit-cover-pages" />
                  </div>
                ))}
              </div>
            </div>
            <span className="orbit-floor" aria-hidden="true" />
          </div>
          <p className="orbit-foot">
            A collection in perspective <span aria-hidden="true">/ 360°</span>
          </p>
        </div>
        <div className="carousel-copy orbit-copy">
          <div key={article.slug}>
            <div className="carousel-kicker">
              <p className="eyebrow">{article.categoryLabel}</p>
              {article.fictional !== false && (
                <span className="sample-tag">Sample article</span>
              )}
            </div>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
            <p className="carousel-meta">
              {article.sampleAuthor} <span aria-hidden="true">/</span>{' '}
              {article.readingMinutes} min
              {article.fictional !== false ? ' sample' : ''} read
            </p>
            <TextLink to={paths.article(article.slug)}>
              {article.fictional !== false
                ? 'Read sample article'
                : 'Read article'}
            </TextLink>
          </div>
        </div>
      </div>
      <div className="carousel-controls">
        <p
          className="carousel-count"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="sr-only">Slide </span>
          {String(active + 1).padStart(2, '0')}{' '}
          <span>/ {String(articles.length).padStart(2, '0')}</span>
        </p>
        <div className="carousel-progress" aria-hidden="true">
          <span
            style={{ width: `${((active + 1) / articles.length) * 100}%` }}
          />
        </div>
        <div className="carousel-dots">
          {articles.map((item, index) => (
            <button
              key={item.slug}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === active ? 'true' : undefined}
              aria-controls={id}
              onClick={() => select(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <div className="carousel-arrows">
          <button
            type="button"
            aria-label="Previous research slide"
            aria-controls={id}
            onClick={() =>
              select(wrapArticleIndex(active - 1, articles.length))
            }
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next research slide"
            aria-controls={id}
            onClick={() =>
              select(wrapArticleIndex(active + 1, articles.length))
            }
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
